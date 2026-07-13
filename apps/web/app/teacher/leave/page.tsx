import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import RequestLeaveForm from './RequestLeaveForm'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-brand-red',
  cancelled: 'bg-gray-100 text-gray-400',
}

export default async function TeacherLeavePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: leaveRaw } = await supabase
    .from('leave_requests')
    .select('id, leave_type, start_date, end_date, reason, status, review_note')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const requests = (leaveRaw ?? []) as unknown as Array<{
    id: string; leave_type: string; start_date: string; end_date: string
    reason: string | null; status: string | null; review_note: string | null
  }>

  async function cancelRequest(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const supabase = await createClient()
    // AUDIT FIX (build): this project's generated Database types collapse
    // update() payload types to `never` — cast once here. RLS additionally
    // enforces (via "leave_requests: cancel own pending") that a user can
    // only cancel their own request while it's still pending.
    await supabase.from('leave_requests').update({ status: 'cancelled' } as unknown as never).eq('id', id)
    revalidatePath('/teacher/leave')
  }

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Leave</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Request Leave</h2>
        <RequestLeaveForm userId={user!.id} institutionId={institutionId} />
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">My Requests ({requests.length})</h2>
        {requests.length === 0 ? (
          <p className="text-gray-400 text-sm">No leave requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Dates</th>
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Note</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700 capitalize">{r.leave_type}</td>
                    <td className="py-2 text-gray-500">
                      {new Date(r.start_date).toLocaleDateString()} – {new Date(r.end_date).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-gray-500">{r.reason ?? '—'}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status ?? 'pending']}`}>
                        {(r.status ?? 'pending').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{r.review_note ?? '—'}</td>
                    <td className="py-2">
                      {r.status === 'pending' && (
                        <form action={cancelRequest}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="text-xs text-brand-red hover:underline">Cancel</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
