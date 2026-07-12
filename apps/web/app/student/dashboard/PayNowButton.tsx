'use client'
/**
 * AUDIT FIX: this is the "wire at least one live action" fix — the student
 * dashboard previously only showed static fake numbers with no interactive
 * element at all. This button actually calls the payment-zalopay edge
 * function (via apps/web/lib/edgeFunctions.ts) and redirects the student to
 * ZaloPay's hosted checkout for their earliest outstanding invoice.
 *
 * Scoped to VND invoices only: ZaloPay/VNPay/MoMo all settle in Vietnamese
 * Dong, so an invoice issued in another currency can't be paid through this
 * button without a currency-conversion decision this session can't make on
 * the institution's behalf. Non-VND invoices show a "contact administration"
 * note instead of a broken or silently-wrong payment flow.
 */
import { useState } from 'react'
import { payments } from '@/lib/edgeFunctions'

export default function PayNowButton(props: {
  invoiceId: string
  userId: string
  institutionId: string
  amountDue: number
  currency: string
  description: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (props.currency !== 'VND') {
    return (
      <p className="text-xs text-gray-400 mt-2">
        This invoice is billed in {props.currency}. Please contact your institution to arrange payment.
      </p>
    )
  }

  async function handlePay() {
    setLoading(true)
    setError('')
    try {
      const result = await payments.zalopay.create({
        invoiceId: props.invoiceId,
        userId: props.userId,
        institutionId: props.institutionId,
        amountVnd: Math.round(props.amountDue),
        description: props.description,
        idempotencyKey: crypto.randomUUID(),
      }) as { orderUrl?: string; error?: string; missing?: string[] }

      // PILOT-LAUNCH HARDENING: the edge function now returns a structured
      // 503 (`{ error: 'Service not configured', missing: [...] }`) when a
      // gateway secret hasn't been set yet, instead of a cryptic 500. Surface
      // that distinction so a student sees "payments aren't set up yet" and
      // an admin checking the console sees exactly which secret is missing.
      if (result.error) {
        setError(result.missing?.length ? `${result.error} (missing: ${result.missing.join(', ')})` : result.error)
        return
      }
      if (result.orderUrl) {
        window.location.href = result.orderUrl
      } else {
        setError('Payment gateway did not return a checkout link')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment initiation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={handlePay}
        disabled={loading}
        className="text-xs font-semibold bg-brand-blue text-white px-3 py-1.5 rounded-md hover:bg-brand-blue-600 transition-colors disabled:opacity-60"
      >
        {loading ? 'Redirecting…' : 'Pay with ZaloPay'}
      </button>
      {error && <p className="text-brand-red text-xs mt-1">{error}</p>}
    </div>
  )
}
