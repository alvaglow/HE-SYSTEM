'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const

export default function TicketQueueActions({ ticketId, status, resolutionNote }: {
  ticketId: string; status: string; resolutionNote: string | null
}) {
  const [localStatus, setLocalStatus] = useState(status)
  const [note, setNote] = useState(resolutionNote ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function save() {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const payload: Record<string, unknown> = { status: localStatus, resolution_note: note.trim() || null }
    if (localStatus === 'resolved' || localStatus === 'closed') {
      payload.resolved_at = new Date().toISOString()
    }
    payload.assigned_to = user!.id
    const { error: updateErr } = await supabase.from('support_tickets').update(payload as unknown as never).eq('id', ticketId)
    setLoading(false)
    if (updateErr) { setError(updateErr.message); return }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      <select value={localStatus} onChange={e => setLocalStatus(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
      </select>
      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Resolution note…" rows={2}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
      {error && <p className="text-brand-red text-xs">{error}</p>}
      <button onClick={save} disabled={loading}
        className="text-xs px-3 py-1.5 rounded-lg bg-brand-blue text-white hover:opacity-90 disabled:opacity-50">
        {loading ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
