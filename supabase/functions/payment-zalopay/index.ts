// HE-SYSTEM Edge Function: payment-zalopay
// Ported from archive/HP SYSTEM/backend/services/zalopay.js (Express + raw Postgres)
// into a Supabase Edge Function backed by payment_gateway_transactions.
//
// Two ways this function is invoked:
//  1. App-initiated, via supabase.functions.invoke('payment-zalopay', { body: { action, ... } })
//     action: 'create' | 'query'
//  2. ZaloPay's own server calling the callback URL directly with its own
//     JSON shape ({ data, mac }) — no `action` wrapper, since ZaloPay controls
//     that payload. We detect this by the absence of `action` + presence of `data`/`mac`.
//
// PILOT-LAUNCH HARDENING: secrets are read without a force-unwrap so a
// missing ZALOPAY_KEY1/KEY2/APP_ID is caught explicitly (503, structured
// error) instead of silently HMAC-signing with the literal string
// "undefined". Every action now validates its required body fields up
// front (400 with the missing field names) and the outbound gateway fetch
// is timeout- and retry-wrapped.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { paymentReceiptEmailHtml } from '../_shared/email-template.ts'
import { requireSelfOrStaff, authErrorResponse } from '../_shared/auth.ts'
import {
  requireSecrets, requireFields, fetchWithTimeout, retry,
  isConfigError, isValidationError, configErrorResponse, validationErrorResponse,
} from '../_shared/resilience.ts'

const APP_ID = Deno.env.get('ZALOPAY_APP_ID')
const KEY1 = Deno.env.get('ZALOPAY_KEY1') // HMAC key for requests
const KEY2 = Deno.env.get('ZALOPAY_KEY2') // HMAC key for callbacks
const ENDPOINT = Deno.env.get('ZALOPAY_ENDPOINT') || 'https://sb-openapi.zalopay.vn/v2'
const CALLBACK_URL = Deno.env.get('ZALOPAY_CALLBACK_URL')

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

async function hmacHex(key: string, data: string, hash: 'SHA-256' = 'SHA-256') {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function supa() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

// deno-lint-ignore no-explicit-any
async function logAudit(
  supabase: any,
  opts: { institutionId?: string | null; userId?: string | null; action: string; resourceType?: string; resourceId?: string; metadata?: Record<string, unknown> },
) {
  try {
    const { data: prev } = await supabase.from('audit_log').select('hash').order('created_at', { ascending: false }).limit(1).maybeSingle()
    const prevHash = (prev as { hash?: string } | null)?.hash ?? 'GENESIS'
    const ts = new Date().toISOString()
    const chainInput = `${prevHash}|${opts.userId ?? 'anon'}|${opts.action}|${ts}`
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(chainInput))
    const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
    await supabase.from('audit_log').insert({
      institution_id: opts.institutionId ?? null,
      user_id: opts.userId ?? null,
      action: opts.action,
      resource_type: opts.resourceType ?? null,
      resource_id: opts.resourceId ?? null,
      metadata: opts.metadata ?? {},
      prev_hash: prevHash,
      hash,
      created_at: ts,
    })
  } catch (err) {
    console.error('logAudit failed (non-fatal):', err)
  }
}

// ── 2σ anomaly detection over the last 90 days of spend ──────────────────────
// deno-lint-ignore no-explicit-any
async function checkAnomaly(supabase: any, userId: string, amountVnd: number) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('payment_spend_history')
    .select('amount')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100)

  const history = (data ?? []).map((r: { amount: number }) => Number(r.amount))
  if (history.length < 3) return { flagged: false as const }

  const mean = history.reduce((a, b) => a + b, 0) / history.length
  const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length
  const threshold = mean + 2 * Math.sqrt(variance)

  if (amountVnd > threshold) {
    return { flagged: true as const, reason: `Amount ${amountVnd} VND exceeds 2σ threshold (${Math.round(threshold)} VND)` }
  }
  return { flagged: false as const }
}

serve(async (req) => {
  const supabase = supa()
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  try {
    // ── ZaloPay's own callback (no `action` wrapper — its payload shape) ─────
    if (!body.action && typeof body.data === 'string' && typeof body.mac === 'string') {
      requireSecrets(['ZALOPAY_KEY2'])

      const dataStr = body.data as string
      const mac = body.mac as string
      const expectedMac = await hmacHex(KEY2!, dataStr)

      // Always store the raw callback, verified or not, before acting on it
      await supabase.from('payment_webhooks').insert({
        gateway: 'zalopay',
        raw_body: JSON.stringify(body),
        headers: Object.fromEntries(req.headers.entries()),
        hmac_valid: timingSafeEqual(expectedMac, mac),
      })

      if (!timingSafeEqual(expectedMac, mac)) {
        return json({ return_code: -1, return_message: 'mac not matched' }, 400)
      }

      const txData = JSON.parse(dataStr) as { app_trans_id: string; zp_trans_id: string | number; return_code: number }
      const status = txData.return_code === 1 ? 'success' : 'failed'

      const { data: txn } = await retry(() => supabase
        .from('payment_gateway_transactions')
        .update({
          status,
          gateway_txn_id: String(txData.zp_trans_id),
          hmac_verified: true,
          webhook_received_at: new Date().toISOString(),
          completed_at: status === 'success' ? new Date().toISOString() : null,
        })
        .eq('gateway', 'zalopay')
        .eq('gateway_order_id', txData.app_trans_id)
        .select('id, invoice_id, user_id, institution_id, amount')
        .single())

      if (status === 'success' && txn) {
        const { data: invoiceRow } = await supabase.from('fee_invoices').select('invoice_number').eq('id', txn.invoice_id).single()
        await supabase.from('fee_invoices').update({ status: 'paid', amount_paid: txn.amount, paid_date: new Date().toISOString() }).eq('id', txn.invoice_id)
        await supabase.from('fee_payments').insert({
          institution_id: txn.institution_id,
          invoice_id: txn.invoice_id,
          student_id: (await supabase.from('students').select('id').eq('user_id', txn.user_id).single()).data?.id,
          amount: txn.amount,
          method: 'ewallet',
          gateway: 'zalopay',
          gateway_transaction_id: txn.id,
          reference_number: String(txData.zp_trans_id),
        })
        await supabase.functions.invoke('notify-send', {
          body: {
            user_id: txn.user_id, title: '✅ Payment Received', body: 'Your ZaloPay payment has been received.',
            html_body: paymentReceiptEmailHtml({ invoiceNumber: invoiceRow?.invoice_number ?? txn.invoice_id, amount: txn.amount, currency: 'VND', gateway: 'zalopay', date: new Date().toISOString() }),
            channel: ['push', 'email', 'in_app'], reference_type: 'invoice', reference_id: txn.invoice_id,
          },
        }).catch((err: unknown) => console.error('notify-send invoke failed (non-fatal):', err))
      }

      await logAudit(supabase, { action: 'payment.zalopay.callback', resourceType: 'payment', metadata: { appTransId: txData.app_trans_id, status } })

      return json({ return_code: 1, return_message: 'success' })
    }

    // ── App-initiated actions ────────────────────────────────────────────────
    const action = body.action as string

    if (action === 'create') {
      requireFields(body, ['invoice_id', 'user_id', 'institution_id', 'amount_vnd', 'description', 'idempotency_key'])
      requireSecrets(['ZALOPAY_APP_ID', 'ZALOPAY_KEY1', 'ZALOPAY_CALLBACK_URL'])

      const { invoice_id, user_id, institution_id, amount_vnd, description, idempotency_key } = body as {
        invoice_id: string; user_id: string; institution_id: string; amount_vnd: number; description: string; idempotency_key: string
      }
      if (typeof amount_vnd !== 'number' || amount_vnd <= 0) {
        return json({ error: 'amount_vnd must be a positive number' }, 400)
      }
      // AUDIT FIX: previously anyone could create a payment "for" any user_id.
      try {
        await requireSelfOrStaff(req, user_id)
      } catch (err) {
        return authErrorResponse(err)
      }

      const { data: existing } = await supabase.from('payment_gateway_transactions').select('*').eq('idempotency_key', idempotency_key).maybeSingle()
      if (existing) return json({ paymentId: existing.id, existing: true, status: existing.status })

      const anomaly = await checkAnomaly(supabase, user_id, amount_vnd)

      const appTime = Date.now()
      const appTransId = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${idempotency_key.slice(0, 8)}`
      const embedData = JSON.stringify({ redirecturl: CALLBACK_URL })
      const items = JSON.stringify([{ itemid: invoice_id, itemname: description, itemprice: amount_vnd, itemquantity: 1 }])

      const orderParams: Record<string, string | number> = {
        app_id: Number(APP_ID),
        app_trans_id: appTransId,
        app_user: user_id,
        app_time: appTime,
        expire_duration_seconds: 900,
        amount: amount_vnd,
        item: items,
        embed_data: embedData,
        description: `HE-SYSTEM - ${description}`,
        callback_url: CALLBACK_URL!,
        bank_code: '',
      }
      const macData = [orderParams.app_id, orderParams.app_trans_id, orderParams.app_user, orderParams.amount, orderParams.app_time, orderParams.embed_data, orderParams.item].join('|')
      orderParams.mac = await hmacHex(KEY1!, macData)

      let gatewayResponse: { return_code: number; return_message: string; order_url?: string; zp_trans_token?: string }
      try {
        const res = await retry(() => fetchWithTimeout(`${ENDPOINT}/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(orderParams as Record<string, string>).toString(),
        }, 10000))
        gatewayResponse = await res.json()
      } catch (err) {
        console.error('ZaloPay gateway call failed:', err)
        return json({ error: 'ZaloPay gateway unavailable', detail: err instanceof Error ? err.message : String(err) }, 502)
      }

      if (gatewayResponse.return_code !== 1) {
        return json({ error: `ZaloPay error: ${gatewayResponse.return_message}` }, 400)
      }

      const { data: txn, error } = await supabase
        .from('payment_gateway_transactions')
        .insert({
          institution_id, invoice_id, user_id, gateway: 'zalopay', gateway_order_id: appTransId,
          idempotency_key, amount: amount_vnd, currency: 'VND', status: 'pending',
          anomaly_flag: anomaly.flagged, anomaly_reason: anomaly.flagged ? anomaly.reason : null,
        })
        .select('id')
        .single()
      if (error) return json({ error: error.message }, 500)

      await supabase.from('payment_spend_history').insert({ user_id, amount: amount_vnd, currency: 'VND' })
      await logAudit(supabase, { institutionId: institution_id, userId: user_id, action: 'payment.zalopay.created', resourceType: 'payment', resourceId: txn!.id, metadata: { amountVnd: amount_vnd, appTransId, anomalyFlag: anomaly.flagged } })

      return json({
        paymentId: txn!.id,
        orderUrl: gatewayResponse.order_url,
        qrCode: gatewayResponse.zp_trans_token,
        appTransId,
        amountVnd: amount_vnd,
        expiresAt: new Date(appTime + 900000).toISOString(),
      }, 201)
    }

    if (action === 'query') {
      requireFields(body, ['app_trans_id'])
      requireSecrets(['ZALOPAY_APP_ID', 'ZALOPAY_KEY1'])

      const { app_trans_id } = body as { app_trans_id: string }
      // AUDIT FIX: only the transaction's owner (or staff) may query its status.
      const { data: txnRow } = await supabase.from('payment_gateway_transactions').select('user_id').eq('gateway', 'zalopay').eq('gateway_order_id', app_trans_id).maybeSingle()
      if (!txnRow) return json({ error: 'Transaction not found' }, 404)
      try {
        await requireSelfOrStaff(req, txnRow.user_id)
      } catch (err) {
        return authErrorResponse(err)
      }
      const mac = await hmacHex(KEY1!, `${APP_ID}|${app_trans_id}|${KEY1}`)
      try {
        const res = await retry(() => fetchWithTimeout(`${ENDPOINT}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ app_id: APP_ID!, app_trans_id, mac }).toString(),
        }, 10000))
        return json(await res.json())
      } catch (err) {
        console.error('ZaloPay query call failed:', err)
        return json({ error: 'ZaloPay gateway unavailable', detail: err instanceof Error ? err.message : String(err) }, 502)
      }
    }

    return json({ error: 'Invalid action' }, 400)
  } catch (err) {
    if (isConfigError(err)) return configErrorResponse(err)
    if (isValidationError(err)) return validationErrorResponse(err)
    console.error('payment-zalopay unhandled error:', err)
    return json({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) }, 500)
  }
})
