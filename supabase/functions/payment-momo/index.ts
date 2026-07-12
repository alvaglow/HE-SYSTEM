// HE-SYSTEM Edge Function: payment-momo
// Ported from archive/HP SYSTEM/backend/services/momo.js into a Supabase Edge
// Function backed by payment_gateway_transactions.
//
// Two ways this function is invoked:
//  1. App-initiated, via supabase.functions.invoke (POST JSON, action: 'create' | 'query')
//  2. MoMo's own server calling the IPN URL directly with its own JSON shape
//     (partnerCode/orderId/signature/resultCode/...) — no `action` wrapper.
//     Detected by the presence of `signature` + `resultCode` and absence of `action`.
//
// PILOT-LAUNCH HARDENING: this function previously read MOMO_* secrets at
// module load with a `!` non-null assertion, which is a compile-time-only
// hint — at runtime a missing secret just becomes the string "undefined"
// baked into HMAC input and request bodies, producing a confusing gateway
// rejection instead of a clear "not configured" error. It also had no
// request-body validation (a malformed 'create' call would throw deep inside
// object destructuring) and no timeout on the outbound gateway fetch. All
// three are fixed below via the shared resilience helpers.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { paymentReceiptEmailHtml } from '../_shared/email-template.ts'
import { requireSelfOrStaff, authErrorResponse } from '../_shared/auth.ts'
import {
  requireSecrets, requireFields, fetchWithTimeout, retry,
  isConfigError, isValidationError, configErrorResponse, validationErrorResponse,
} from '../_shared/resilience.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const PARTNER_CODE = Deno.env.get('MOMO_PARTNER_CODE')
const ACCESS_KEY = Deno.env.get('MOMO_ACCESS_KEY')
const SECRET_KEY = Deno.env.get('MOMO_SECRET_KEY')
const ENDPOINT = Deno.env.get('MOMO_ENDPOINT') || 'https://test-payment.momo.vn/v2/gateway/api'
const NOTIFY_URL = Deno.env.get('MOMO_NOTIFY_URL')
const RETURN_URL = Deno.env.get('MOMO_RETURN_URL')

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function hmacHex(key: string, data: string) {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
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
      institution_id: opts.institutionId ?? null, user_id: opts.userId ?? null, action: opts.action,
      resource_type: opts.resourceType ?? null, resource_id: opts.resourceId ?? null,
      metadata: opts.metadata ?? {}, prev_hash: prevHash, hash, created_at: ts,
    })
  } catch (err) {
    // Audit logging must never take down the primary flow (a payment must
    // still succeed even if the audit chain write hiccups) — log and move on.
    console.error('logAudit failed (non-fatal):', err)
  }
}

// deno-lint-ignore no-explicit-any
async function checkAnomaly(supabase: any, userId: string, amountVnd: number) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase.from('payment_spend_history').select('amount').eq('user_id', userId).gte('created_at', since).order('created_at', { ascending: false }).limit(100)
  const history = (data ?? []).map((r: { amount: number }) => Number(r.amount))
  if (history.length < 3) return { flagged: false as const }
  const mean = history.reduce((a, b) => a + b, 0) / history.length
  const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length
  const threshold = mean + 2 * Math.sqrt(variance)
  if (amountVnd > threshold) return { flagged: true as const, reason: `Amount ${amountVnd} VND exceeds 2σ threshold (${Math.round(threshold)} VND)` }
  return { flagged: false as const }
}

serve(async (req) => {
  const preflight = handleCors(req)
  if (preflight) return preflight
  const supabase = supa()
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  try {
    // ── MoMo's own IPN callback ──────────────────────────────────────────────
    if (!body.action && typeof body.signature === 'string' && body.resultCode !== undefined) {
      requireSecrets(['MOMO_ACCESS_KEY', 'MOMO_SECRET_KEY', 'MOMO_PARTNER_CODE'])

      const b = body as Record<string, string | number>
      const raw = `accessKey=${ACCESS_KEY}&amount=${b.amount}&extraData=${b.extraData}`
        + `&message=${b.message}&orderId=${b.orderId}&orderInfo=${b.orderInfo}`
        + `&orderType=${b.orderType}&partnerCode=${b.partnerCode}&payType=${b.payType}`
        + `&requestId=${b.requestId}&responseTime=${b.responseTime}`
        + `&resultCode=${b.resultCode}&transId=${b.transId}`
      const expected = await hmacHex(SECRET_KEY!, raw)
      const valid = timingSafeEqual(expected, String(b.signature))

      await supabase.from('payment_webhooks').insert({ gateway: 'momo', raw_body: JSON.stringify(body), hmac_valid: valid })

      if (!valid) return json({ error: 'Signature mismatch' }, 400)

      const status = b.resultCode === 0 ? 'success' : 'failed'
      // Idempotent update keyed on gateway_order_id — safe to retry on a
      // transient network/DB blip without risk of double-processing.
      const { data: txn } = await retry(() => supabase
        .from('payment_gateway_transactions')
        .update({ status, gateway_txn_id: String(b.transId), hmac_verified: true, webhook_received_at: new Date().toISOString(), completed_at: status === 'success' ? new Date().toISOString() : null })
        .eq('gateway', 'momo')
        .eq('gateway_order_id', b.orderId)
        .select('id, invoice_id, user_id, institution_id, amount')
        .single())

      if (status === 'success' && txn) {
        const { data: invoiceRow } = await supabase.from('fee_invoices').select('invoice_number').eq('id', txn.invoice_id).single()
        await supabase.from('fee_invoices').update({ status: 'paid', amount_paid: txn.amount, paid_date: new Date().toISOString() }).eq('id', txn.invoice_id)
        await supabase.from('fee_payments').insert({
          institution_id: txn.institution_id, invoice_id: txn.invoice_id,
          student_id: (await supabase.from('students').select('id').eq('user_id', txn.user_id).single()).data?.id,
          amount: txn.amount, method: 'ewallet', gateway: 'momo', gateway_transaction_id: txn.id, reference_number: String(b.transId),
        })
        await supabase.functions.invoke('notify-send', {
          body: {
            user_id: txn.user_id, title: '✅ Payment Received', body: 'Your MoMo payment has been received.',
            html_body: paymentReceiptEmailHtml({ invoiceNumber: invoiceRow?.invoice_number ?? txn.invoice_id, amount: txn.amount, currency: 'VND', gateway: 'momo', date: new Date().toISOString() }),
            channel: ['push', 'email', 'in_app'], reference_type: 'invoice', reference_id: txn.invoice_id,
          },
        }).catch((err: unknown) => console.error('notify-send invoke failed (non-fatal):', err))
      }

      await logAudit(supabase, { action: 'payment.momo.ipn', resourceType: 'payment', metadata: { orderId: b.orderId, status, resultCode: b.resultCode } })

      // MoMo expects exactly this response shape on receipt
      return json({ partnerCode: PARTNER_CODE, requestId: b.requestId, orderId: b.orderId, resultCode: 0, message: 'Success', responseTime: Date.now() })
    }

    // ── App-initiated actions ─────────────────────────────────────────────────
    const action = body.action as string

    if (action === 'create') {
      requireFields(body, ['invoice_id', 'user_id', 'institution_id', 'amount_vnd', 'description', 'idempotency_key'])
      requireSecrets(['MOMO_PARTNER_CODE', 'MOMO_ACCESS_KEY', 'MOMO_SECRET_KEY', 'MOMO_NOTIFY_URL', 'MOMO_RETURN_URL'])

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

      const requestId = crypto.randomUUID()
      const orderId = `${PARTNER_CODE}_${idempotency_key.slice(0, 8)}_${Date.now()}`
      const orderInfo = `HE-SYSTEM - ${description}`
      const extraData = btoa(JSON.stringify({ invoiceId: invoice_id, userId: user_id }))

      const params = {
        partnerCode: PARTNER_CODE, requestType: 'payWithMethod', ipnUrl: NOTIFY_URL, redirectUrl: RETURN_URL,
        orderId, amount: amount_vnd, orderInfo, requestId, extraData, lang: 'vi', autoCapture: true, orderExpireTime: 15,
      }
      const raw = `accessKey=${ACCESS_KEY}&amount=${params.amount}&extraData=${params.extraData}`
        + `&ipnUrl=${params.ipnUrl}&orderId=${params.orderId}&orderInfo=${params.orderInfo}`
        + `&partnerCode=${params.partnerCode}&redirectUrl=${params.redirectUrl}`
        + `&requestId=${params.requestId}&requestType=${params.requestType}`
      const signature = await hmacHex(SECRET_KEY!, raw)

      let gatewayRes: { resultCode: number; message: string; payUrl?: string; deeplink?: string; qrCodeUrl?: string }
      try {
        // 'create' is protected by idempotency_key + the `existing` short-
        // circuit above, so retrying a timed-out request is safe.
        const res = await retry(() => fetchWithTimeout(`${ENDPOINT}/create`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...params, signature }),
        }, 10000))
        gatewayRes = await res.json()
      } catch (err) {
        console.error('MoMo gateway call failed:', err)
        return json({ error: 'MoMo gateway unavailable', detail: err instanceof Error ? err.message : String(err) }, 502)
      }

      if (gatewayRes.resultCode !== 0) return json({ error: `MoMo error ${gatewayRes.resultCode}: ${gatewayRes.message}` }, 400)

      const { data: txn, error } = await supabase
        .from('payment_gateway_transactions')
        .insert({ institution_id, invoice_id, user_id, gateway: 'momo', gateway_order_id: orderId, idempotency_key, amount: amount_vnd, currency: 'VND', status: 'pending', anomaly_flag: anomaly.flagged, anomaly_reason: anomaly.flagged ? anomaly.reason : null })
        .select('id')
        .single()
      if (error) return json({ error: error.message }, 500)

      await supabase.from('payment_spend_history').insert({ user_id, amount: amount_vnd, currency: 'VND' })
      await logAudit(supabase, { institutionId: institution_id, userId: user_id, action: 'payment.momo.created', resourceType: 'payment', resourceId: txn!.id, metadata: { amountVnd: amount_vnd, orderId, anomalyFlag: anomaly.flagged } })

      return json({ paymentId: txn!.id, payUrl: gatewayRes.payUrl, deeplink: gatewayRes.deeplink, qrCodeUrl: gatewayRes.qrCodeUrl, orderId, amountVnd: amount_vnd, expiresInSeconds: 900 }, 201)
    }

    if (action === 'query') {
      requireFields(body, ['order_id'])
      requireSecrets(['MOMO_PARTNER_CODE', 'MOMO_ACCESS_KEY', 'MOMO_SECRET_KEY'])

      const { order_id } = body as { order_id: string }
      // AUDIT FIX: only the transaction's owner (or staff) may query its status.
      const { data: txnRow } = await supabase.from('payment_gateway_transactions').select('user_id').eq('gateway', 'momo').eq('gateway_order_id', order_id).maybeSingle()
      if (!txnRow) return json({ error: 'Transaction not found' }, 404)
      try {
        await requireSelfOrStaff(req, txnRow.user_id)
      } catch (err) {
        return authErrorResponse(err)
      }
      const requestId = crypto.randomUUID()
      const signature = await hmacHex(SECRET_KEY!, `accessKey=${ACCESS_KEY}&orderId=${order_id}&partnerCode=${PARTNER_CODE}&requestId=${requestId}`)
      try {
        const res = await retry(() => fetchWithTimeout(`${ENDPOINT}/query`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partnerCode: PARTNER_CODE, requestId, orderId: order_id, lang: 'vi', signature }),
        }, 10000))
        return json(await res.json())
      } catch (err) {
        console.error('MoMo query call failed:', err)
        return json({ error: 'MoMo gateway unavailable', detail: err instanceof Error ? err.message : String(err) }, 502)
      }
    }

    return json({ error: 'Invalid action' }, 400)
  } catch (err) {
    if (isConfigError(err)) return configErrorResponse(err)
    if (isValidationError(err)) return validationErrorResponse(err)
    console.error('payment-momo unhandled error:', err)
    return json({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) }, 500)
  }
})
