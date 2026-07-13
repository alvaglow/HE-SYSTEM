'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { notifySend } from '@/lib/edgeFunctions'

export default function PayoutDecisionForm({ payoutId, institutionId }: { payoutId: string; institutionId: string }) {
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function getPartnerUserId(): Promise<string | null> {
    const { data } = await supabase.from('partner_payouts').select('partners(user_id)').eq('id', payoutId).single()
    const row = data as unknown as { partners: { user_id: string } | null } | null
    return row?.partners?.user_id ?? null
  }

  async function notifyPartner(status: string) {
    const partnerUserId = await getPartnerUserId()
    if (!partnerUserId) return
    try {
      await notifySend({
        userId: partnerUserId,
        title: status === 'completed' ? 'Payout completed' : status === 'rejected' ? 'Payout rejected' : 'Payout being processed',
        body: status === 'completed' ? 'Your payout has been paid out — check the receipt in your Payouts page.'
          : status === 'rejected' ? (notes || 'Your payout request was rejected.') : 'Your payout request is now being processed.',
        channel: ['in_app', 'push', 'email'],
        referenceType: 'partner_payouts',
        referenceId: payoutId,
      })
    } catch (err) {
      console.error('notifySend failed (non-fatal):', err)
    }
  }

  async function decide(status: 'processing' | 'completed' | 'rejected') {
    setLoading(status)
    setError('')

    let receiptPath: string | null = null
    if (status === 'completed' && receiptFile) {
      receiptPath = `${institutionId}/payouts/${payoutId}-${Date.now()}-${receiptFile.name}`
      const { error: uploadErr } = await supabase.storage.from('receipts').upload(receiptPath, receiptFile)
      if (uploadErr) { setLoading(null); setError(uploadErr.message); return }
    }

    // AUDIT FIX (build): this project's generated Database types collapse
    // update() payload types to `never` — cast once here, same pattern used
    // across every other portal form in this app.
    const { error: updateErr } = await supabase.from('partner_payouts').update({
      status,
      processed_at: status === 'completed' || status === 'rejected' ? new Date().toISOString() : null,
      notes: notes || null,
      ...(receiptPath ? { receipt_url: receiptPath } : {}),
    } as unknown as never).eq('id', payoutId)

    if (updateErr) { setLoading(null); setError(updateErr.message); return }

    await notifyPartner(status)
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <input type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] ?? null)}
          className="text-xs text-gray-500" />
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note (optional)"
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 flex-1 min-w-[140px]" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => decide('processing')} disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded-lg bg-brand-blue text-white hover:opacity-90 disabled:opacity-50">
          {loading === 'processing' ? 'Working…' : 'Mark Processing'}
        </button>
        <button onClick={() => decide('completed')} disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
          {loading === 'completed' ? 'Working…' : 'Mark Completed'}
        </button>
        <button onClick={() => decide('rejected')} disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded-lg bg-brand-red text-white hover:opacity-90 disabled:opacity-50">
          {loading === 'rejected' ? 'Working…' : 'Reject'}
        </button>
      </div>
      {error && <p className="text-brand-red text-xs">{error}</p>}
    </div>
  )
}
