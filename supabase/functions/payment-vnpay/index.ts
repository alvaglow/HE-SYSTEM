// HE-SYSTEM Edge Function: payment-vnpay
// Ported from archive/HP SYSTEM/backend/services/vnpay.js into a Supabase Edge
// Function backed by payment_gateway_transactions.
//
// Three ways this function is invoked:
//  1. App-initiated 'create', via supabase.functions.invoke (POST JSON, action: 'create')
//  2. VNPay redirects the *user's browser* back to this endpoint with a GET
//     request and vnp_* query params (the "return URL") — no `action` field,
//     since VNPay controls the redirect.
//  3. App-initiated 'query' (POST JSON, action: 'query') to check status directly
//     with VNPay's querydr API.
//
// PILOT-LAUNCH HARDENING: secrets are no longer force-unwrapped with `!` at
// module load (a missing VNPAY_HASH_SECRET used to silently become the
// string "undefined" fed into the HMAC, producing a signature that would
// never validate and a deeply confusing failure mode). Every entry point now
// checks its required secrets up front and returns a structured 503 if any
// are absent, validates its input fields with a 400, and wraps the outbound
// gateway call in a timeout.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { paymentReceiptEmailHtml } from '../_shared/email-template.ts'
import { requireSelfOrStaff, authErrorResponse } from '../_shared/auth.ts'
import {
  requireSecrets, requireFields, fetchWithTimeout, retry,
  isConfigError, isValidationError, configErrorResponse, validationErrorResponse,
} from '../_shared/resilience.ts'

const TMN_CODE = Deno.env.get('VNPAY_TMN_CODE')
const HASH_SECRET = Deno.env.get('VNPAY_HASH_SECRET')
const ENDPOINT = Deno.env.get('VNPAY_ENDPOINT') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
const QUERY_URL = Deno.env.get('VNPAY_QUERY_URL') || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction'
const RETURN_URL = Deno.env.get('VNPAY_RETURN_URL')

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

async function hmacHex(key: string, data: string) {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function buildSortedQueryString(params: Record<string, string | number>) {
  return Object.keys(params)
    .filter((k) => params[k] !== '' && params[k] !== undefined && params[k] !== null)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
}

function vnMoment(offsetMinutes = 0) {
  // Asia/Ho_Chi_Minh is UTC+7, no DST
  const d = new Date(Date.now() + offsetMinutes * 60000 + 7 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
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
  const supabase = supa()
  const url = new URL(req.url)

  try {
    // ── VNPay return-URL redirect (GET, user's browser) ────────────────────
    if (req.method === 'GET' && url.searchParams.has('vnp_SecureHash')) {
      requireSecrets(['VNPAY_HASH_SECRET'])

      const params = Object.fromEntries(url.searchParams.entries())
      const { vnp_SecureHash, vnp_SecureHashType, ...rest } = params
      const expected = await hmacHex(HASH_SECRET!, buildSortedQueryString(rest))

      if (!timingSafeEqual(expected, vnp_SecureHash)) {
        return json({ error: 'VNPay signature invalid' }, 400)
      }

      const status = params.vnp_ResponseCode === '00' ? 'success' : 'failed'
      const txnRef = params.vnp_TxnRef
      const gatewayTxnId = params.vnp_TransactionNo

      const { data: txn } = await retry(() => supabase
        .from('payment_gateway_transactions')
        .update({ status, gateway_txn_id: gatewayTxnId, hmac_verified: true, completed_at: status === 'success' ? new Date().toISOString() : null })
        .eq('gateway', 'vnpay')
        .eq('gateway_order_id', txnRef)
        .select('id, invoice_id, user_id, institution_id, amount')
        .single())

      if (status === 'success' && txn) {
        const { data: invoiceRow } = await supabase.from('fee_invoices').select('invoice_number').eq('id', txn.invoice_id).single()
        await supabase.from('fee_invoices').update({ status: 'paid', amount_paid: txn.amount, paid_date: new Date().toISOString() }).eq('id', txn.invoice_id)
        await supabase.from('fee_payments').insert({
          institution_id: txn.institution_id, invoice_id: txn.invoice_id,
          student_id: (await supabase.from('students').select('id').eq('user_id', txn.user_id).single()).data?.id,
          amount: txn.amount, method: 'ewallet', gateway: 'vnpay', gateway_transaction_id: txn.id, reference_number: gatewayTxnId,
        })
        await supabase.functions.invoke('notify-send', {
          body: {
            user_id: txn.user_id, title: '✅ Payment Received', body: 'Your VNPay payment has been received.',
            html_body: paymentReceiptEmailHtml({ invoiceNumber: invoiceRow?.invoice_number ?? txn.invoice_id, amount: txn.amount, currency: 'VND', gateway: 'vnpay', date: new Date().toISOString() }),
            channel: ['push', 'email', 'in_app'], reference_type: 'invoice', reference_id: txn.invoice_id,
          },
        }).catch((err: unknown) => console.error('notify-send invoke failed (non-fatal):', err))
      }

      await logAudit(supabase, { action: 'payment.vnpay.return', resourceType: 'payment', metadata: { txnRef, status, responseCode: params.vnp_ResponseCode } })

      return json({ status, txnRef, responseCode: params.vnp_ResponseCode })
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }
    const action = body.action as string

    if (action === 'create') {
      requireFields(body, ['invoice_id', 'user_id', 'institution_id', 'amount_vnd', 'description', 'idempotency_key'])
      requireSecrets(['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET', 'VNPAY_RETURN_URL'])

      const { invoice_id, user_id, institution_id, amount_vnd, description, idempotency_key, ip_addr } = body as {
        invoice_id: string; user_id: string; institution_id: string; amount_vnd: number; description: string; idempotency_key: string; ip_addr?: string
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

      const txnRef = `${vnMoment().slice(0, 8)}_${idempotency_key.slice(0, 8)}`
      const vnpParams: Record<string, string | number> = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: TMN_CODE!,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: encodeURIComponent(`HE-SYSTEM - ${description}`).slice(0, 255),
        vnp_OrderType: 'edu',
        vnp_Amount: amount_vnd * 100, // VNPay expects amount * 100
        vnp_ReturnUrl: RETURN_URL!,
        vnp_IpAddr: ip_addr || '127.0.0.1',
        vnp_CreateDate: vnMoment(),
        vnp_ExpireDate: vnMoment(15),
        vnp_BankCode: '',
      }
      const secureHash = await hmacHex(HASH_SECRET!, buildSortedQueryString(vnpParams))
      const paymentUrl = `${ENDPOINT}?${buildSortedQueryString(vnpParams)}&vnp_SecureHash=${secureHash}&vnp_SecureHashType=SHA512`

      const { data: txn, error } = await supabase
        .from('payment_gateway_transactions')
        .insert({ institution_id, invoice_id, user_id, gateway: 'vnpay', gateway_order_id: txnRef, idempotency_key, amount: amount_vnd, currency: 'VND', status: 'pending', anomaly_flag: anomaly.flagged, anomaly_reason: anomaly.flagged ? anomaly.reason : null })
        .select('id')
        .single()
      if (error) return json({ error: error.message }, 500)

      await supabase.from('payment_spend_history').insert({ user_id, amount: amount_vnd, currency: 'VND' })
      await logAudit(supabase, { institutionId: institution_id, userId: user_id, action: 'payment.vnpay.created', resourceType: 'payment', resourceId: txn!.id, metadata: { amountVnd: amount_vnd, txnRef, anomalyFlag: anomaly.flagged } })

      return json({ paymentId: txn!.id, paymentUrl, txnRef, amountVnd: amount_vnd, expiresInSeconds: 900 }, 201)
    }

    if (action === 'query') {
      requireFields(body, ['txn_ref', 'trans_date'])
      requireSecrets(['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET'])

      const { txn_ref, trans_date } = body as { txn_ref: string; trans_date: string }
      // AUDIT FIX: only the transaction's owner (or staff) may query its status.
      const { data: txnRow } = await supabase.from('payment_gateway_transactions').select('user_id').eq('gateway', 'vnpay').eq('gateway_order_id', txn_ref).maybeSingle()
      if (!txnRow) return json({ error: 'Transaction not found' }, 404)
      try {
        await requireSelfOrStaff(req, txnRow.user_id)
      } catch (err) {
        return authErrorResponse(err)
      }
      const params: Record<string, string | number> = {
        vnp_RequestId: `${Date.now()}`,
        vnp_Version: '2.1.0',
        vnp_Command: 'querydr',
        vnp_TmnCode: TMN_CODE!,
        vnp_TxnRef: txn_ref,
        vnp_OrderInfo: `Query ${txn_ref}`,
        vnp_TransDate: trans_date,
        vnp_CreateDate: vnMoment(),
        vnp_IpAddr: '127.0.0.1',
      }
      const paramsWithHash = { ...params, vnp_SecureHash: await hmacHex(HASH_SECRET!, buildSortedQueryString(params)) }
      try {
        const res = await retry(() => fetchWithTimeout(QUERY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paramsWithHash) }, 10000))
        return json(await res.json())
      } catch (err) {
        console.error('VNPay query call failed:', err)
        return json({ error: 'VNPay gateway unavailable', detail: err instanceof Error ? err.message : String(err) }, 502)
      }
    }

    return json({ error: 'Invalid action' }, 400)
  } catch (err) {
    if (isConfigError(err)) return configErrorResponse(err)
    if (isValidationError(err)) return validationErrorResponse(err)
    console.error('payment-vnpay unhandled error:', err)
    return json({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) }, 500)
  }
})
