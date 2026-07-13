'use client'
/**
 * Parent-side "pay on behalf of your child" button. Same gateway integration
 * as the student dashboard's PayNowButton (ZaloPay, VND-only for the reason
 * documented there) — duplicated rather than cross-imported across route
 * folders to keep each portal's pages self-contained.
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
        This invoice is billed in {props.currency}. Please contact the institution to arrange payment.
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
