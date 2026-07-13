'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { notifySend } from '@/lib/edgeFunctions'

export default function LeaveDecisionButtons({ requestId, userId }: { requestId: string; userId: string }) {
  const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function decide(status: 'approved' | 'rejected') {
    setLoading(status)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    // AUDIT FIX (build): this project's generated Database types collapse
    // update() payload types to `never` — cast once here, same pattern used
    // across every other portal form in this app.
    const { error: updateErr } = await supabase.from('leave_requests').update({
      status, reviewed_by: user!.id, reviewed_at: new Date().toISOString(),
    } as unknown as never).eq('id', requestId)
    if (updateErr) { setLoading(null); setError(updateErr.message); return }

    // notify-send is staff-gated (see supabase/functions/_shared/auth.ts) —
    // this call is made from a real admin/management session, so it passes
    // the requireStaff check directly; no extra plumbing needed.
    try {
      await notifySend({
        userId,
        title: status === 'approved' ? 'Leave request approved' : 'Leave request rejected',
        body: status === 'approved' ? 'Your leave request has been approved.' : 'Your leave request was not approved. Check with your admin for details.',
        channel: ['in_app', 'push', 'email'],
        referenceType: 'leave_requests',
        referenceId: requestId,
      })
    } catch (err) {
      console.error('notifySend failed (non-fatal):', err)
    }

    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-1">
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
      {error && <p className="text-brand-red text-xs">{error}</p>}
    </div>
  )
}
