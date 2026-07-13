import { createClient } from '@/lib/supabase/server'
import LeaveDecisionButtons from './LeaveDecisionButtons'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-brand-red/10 text-brand-red',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default async function AdminLeavePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: requestsRaw } = await supabase
    .from('leave_requests')
    .select('id, user_id, leave_type, start_date, end_date, reason, status, review_note, created_at, users(full_name, email, role)')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false })
    .limit(100)

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other admin page in this app.
  const requests = (requestsRaw ?? []) as unknown as Array<{
    id: string; user_id: string; leave_type: string; start_date: string; end_date: string
    reason: string | null; status: string | null; review_note: string | null; created_at: string
    users: { full_name: string | null; email: string; role: string } | null
  }>

  const pending = requests.filter(r => r.status === 'pending')
  const decided = requests.filter(r => r.status !== 'pending')

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Leave Requests</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">
          Pending Approval ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-gray-400 text-sm">No pending leave requests.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Requester</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Dates</th>
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2 font-medium">Decision</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 align-top">
                    <td className="py-3 text-gray-700">
                      {r.users?.full_name ?? '—'}
                      <div className="text-xs text-gray-400">{r.users?.role} · {r.users?.email}</div>
                    </td>
                    <td className="py-3 text-gray-500 capitalize">{r.leave_type}</td>
                    <td className="py-3 text-gray-500">
                      {new Date(r.start_date).toLocaleDateString()} – {new Date(r.end_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-gray-500 max-w-xs">{r.reason ?? '—'}</td>
                    <td className="py-3"><LeaveDecisionButtons requestId={r.id} userId={r.user_id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">
          History ({decided.length})
        </h2>
        {decided.length === 0 ? (
          <p className="text-gray-400 text-sm">No reviewed leave requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Requester</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Dates</th>
                  <th className="pb-2 font-medium">Note</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {decided.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{r.users?.full_name ?? '—'}</td>
                    <td className="py-2 text-gray-500 capitalize">{r.leave_type}</td>
                    <td className="py-2 text-gray-500">
                      {new Date(r.start_date).toLocaleDateString()} – {new Date(r.end_date).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-gray-500">{r.review_note ?? '—'}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status ?? 'pending']}`}>
                        {(r.status ?? 'pending').toUpperCase()}
                      </span>
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
