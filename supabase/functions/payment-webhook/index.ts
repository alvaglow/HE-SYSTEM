// HE-SYSTEM Edge Function: payment-webhook
// Handles Stripe webhook events

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@15.7.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' })

serve(async (req) => {
  const sig = req.headers.get('stripe-signature')!
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!)
  } catch {
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

    // Mark invoice paid
    await supabase.from('fee_invoices')
      .update({ status: 'paid', amount_paid: amount, paid_date: new Date().toISOString() })
      .eq('id', invoiceId)

    // Record payment
    await supabase.from('fee_payments').insert({
      invoice_id: invoiceId,
      student_id: studentId,
      amount,
      method: 'card',
      stripe_payment_intent_id: pi.id,
      paid_at: new Date().toISOString(),
    })

    // Notify student
    await supabase.functions.invoke('notify-send', {
      body: {
        user_id_via_student: studentId,
        title: '✅ Payment Received',
        body: `Your payment of RM${amount.toFixed(2)} has been received.`,
        channel: ['push', 'email', 'in_app'],
        reference_type: 'invoice',
        reference_id: invoiceId,
      }
    })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }, status: 200
  })
})
