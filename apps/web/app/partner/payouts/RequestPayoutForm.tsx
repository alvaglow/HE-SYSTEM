'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RequestPayoutForm({ partnerId, institutionId, available }: { partnerId: string; institutionId: string; available: number }) {
  const [amount, setAmount] = useState('')
  const [bankReference, setBankReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const amt = Number(amount)
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return }
    if (amt > available) { setError(`Amount exceeds available balance of RM${available.toLocaleString()}.`); return }
    setLoading(true)
    // AUDIT FIX (build): this project's generated Database types collapse
    // insert()/update() payload types to `never` — cast once here, same
    // pattern used across every other portal form in this app. RLS forces
    // status back to 'requested' regardless of what's sent.
    const { error } = await supabase.from('partner_payouts').insert({
      partner_id: partnerId,
      institution_id: institutionId,
      amount: amt,
      bank_reference: bankReference || null,
      status: 'requested',
    } as unknown as never)
    setLoading(false)
    if (error) { setError(error.message); return }
    setAmount('')
    setBankReference('')
    router.refresh()
  }

  if (available <= 0) {
    return <p className="text-gray-400 text-sm">No approved commission balance available to withdraw yet.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input type="number" min="1" max={available} step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}
        placeholder={`Up to RM${available.toLocaleString()}`}
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <input type="text" value={bankReference} onChange={e => setBankReference(e.target.value)}
        placeholder="Bank account / reference (optional)"
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <button type="submit" disabled={loading} className="btn-primary whitespace-nowrap">
        {loading ? 'Requesting…' : 'Request Payout'}
      </button>
      {error && <p className="tex