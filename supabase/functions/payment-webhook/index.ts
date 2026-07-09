// HE-SYSTEM Edge Function: payment-webhook
// Handles Stripe webhook events
//
// PILOT-LAUNCH HARDENING: the Stripe client used to be constructed at module
// load with `new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, ...)`. If that
// secret isn't set yet (exactly the situation on day one before real keys
// are configured), the Stripe SDK throws during construction — which means
// the *entire function fails to boot*, and every single invocation returns
// Supabase's generic "BOOT_ERROR" with no indication of why. That's the
// worst possible failure mode for a pilot: it looks like the whole edge
// function is broken rather than "one secret is missing." Stripe is now
// constructed lazily inside the handler, after an explicit secret check
// that returns a clear 503.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@15.7.0?target=deno'
import { paymentReceiptEmailHtml } from '../_shared/email-template.ts'
import { requireSecrets, retry, isConfigError, configErrorResponse } from '../_shared/resilience.ts'

serve(async (req) => {
  try {
    requireSecrets(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'])

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' })

    const sig = req.headers.get('stripe-signature')
    if (!sig) return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    const body = await req.text()

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!)
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err)
      return new Response('Webhook signature verification failed', { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      const invoiceId = pi.metadata.invoice_id
      const studentId = pi.metadata.student_id
      const amount = pi.amount / 100 // Stripe stores in cents

      if (!invoiceId || !studentId) {
        console.error('payment_intent.succeeded missing invoice_id/student_id metadata:', pi.id)
        // Acknowledge receipt anyway (200) — Stripe retries on non-2xx, and
        // retrying won't fix missing metadata that was set at PaymentIntent
        // creation time. Log loudly instead so it's caught in monitoring.
        return new Response(JSON.stringify({ received: true, warning: 'missing metadata, payment not recorded' }), {
          headers: { 'Content-Type': 'application/json' }, status: 200,
        })
      }

      // Idempotent by invoiceId — safe to retry on a transient DB blip.
      await retry(() => supabase.from('fee_invoices')
        .update({ status: 'paid', amount_paid: amount, paid_date: new Date().toISOString() })
        .eq('id', invoiceId))

      // Record payment
      await supabase.from('fee_payments').insert({
        invoice_id: invoiceId,
        student_id: studentId,
        amount,
        method: 'card',
        gateway: 'stripe',
        stripe_payment_intent_id: pi.id,
        paid_at: new Date().toISOString(),
      })

      // Best-effort audit trail — a webhook must still 200 back to Stripe
      // even if this insert fails, or Stripe will keep retrying forever.
      try {
        await supabase.from('audit_log').insert({
          action: 'payment.stripe.webhook', resource_type: 'payment', resource_id: pi.id,
          metadata: { amount, invoiceId, studentId }, created_at: new Date().toISOString(),
        })
      } catch (err) {
        console.error('audit_log insert failed (non-fatal):', err)
      }

      // Notify student — resolve students.id -> users.id first; notify-send takes a
      // users.id, not a students.id (this previously sent the wrong key and the
      // notification silently failed to resolve any user).
      const { data: studentRow } = await supabase.from('students').select('user_id').eq('id', studentId).single()
      if (studentRow) {
        const { data: invoiceRow } = await supabase.from('fee_invoices').select('invoice_number').eq('id', invoiceId).single()
        await supabase.functions.invoke('notify-send', {
          body: {
            user_id: studentRow.user_id,
            title: '✅ Payment Received',
            body: `Your payment of RM${amount.toFixed(2)} has been received.`,
            html_body: paymentReceiptEmailHtml({ invoiceNumber: invoiceRow?.invoice_number ?? invoiceId, amount, currency: 'MYR', gateway: 'stripe', date: new Date().toISOString() }),
            channel: ['push', 'email', 'in_app'],
            reference_type: 'invoice',
            reference_id: invoiceId,
          }
        }).catch((err: unknown) => console.error('notify-send invoke failed (non-fatal):', err))
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' }, status: 200
    })
  } catch (err) {
    if (isConfigError(err)) return configErrorResponse(err)
    console.error('payment-webhook unhandled error:', err)
    // Stripe retries non-2xx responses, so a genuine 500 here is correct
    // (as opposed to config errors, which retrying won't fix).
    return new Response(JSON.stringify({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
