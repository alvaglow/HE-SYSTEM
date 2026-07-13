'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ReviewActions({ applicationId }: { applicationId: string }) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function decide(status: 'approved' | 'rejected') {
    setLoading(status)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('graduation_applications').update({
      status, review_notes: notes.trim() || null, reviewed_by: user!.id, reviewed_at: new Date().toISOString(),
    } as unknown as never).eq('id', applicationId)
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Review notes…" rows={2}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
      <div className="flex gap-2">
        <button onClick={() => decide('approved')} disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
          {loading === 'approved' ? 'Approving…' : 'Approve'}
        </button>
        <button onClick={() => decide('rejected')} disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded-lg bg-brand-red text-white hover:opacity-90 disabled:opacity-50">
          {loading === 'rejected' ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
    </div>
  )
}
