import { createClient } from '@/lib/supabase/server'
import TicketQueueActions from './TicketQueueActions'

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-yellow-50 text-yellow-700',
  in_progress: 'bg-blue-50 text-brand-blue',
  resolved: 'bg-green-50 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-blue-50 text-brand-blue',
  high: 'bg-orange-50 text-orange-700',
  urgent: 'bg-brand-red/10 text-brand-red',
}

export default async function AdminSupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: ticketsRaw } = await supabase
    .from('support_tickets')
    .select('id, category, subject, description, status, priority, resolution_note, created_at, users!support_tickets_created_by_fkey(full_name, email, role)')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false })
    .limit(200)

  const tickets = (ticketsRaw ?? []) as unknown as Array<{
    id: string; category: string; subject: string; description: string | null
    status: string; priority: string; resolution_note: string | null; created_at: string
    users: { full_name: string | null; email: string; role: string } | null
  }>

  const open = tickets.filter(t => t.status === 'open' || t.status === 'in_progress')
  const closed = tickets.filter(t => t.status === 'resolved' || t.status === 'closed')

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Support Tickets</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Open ({open.length})</h2>
        {open.length === 0 ? (
          <p className="text-gray-400 text-sm">No open tickets.</p>
        ) : (
          <div className="space-y-3">
            {open.map(t => (
              <div key={t.id} className="border border-gray-100 rounded-lg p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-700">{t.subject}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[t.status]}`}>{t.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">
                    {t.category} · {t.users?.full_name ?? '—'} ({t.users?.role}) · {new Date(t.created_at).toLocaleDateString()}
                  </p>
                  {t.description && <p className="text-sm text-gray-500 mt-2">{t.description}</p>}
                </div>
                <TicketQueueActions ticketId={t.id} status={t.status} resolutionNote={t.resolution_note} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Resolved / Closed ({closed.length})</h2>
        {closed.length === 0 ? (
          <p className="text-gray-400 text-sm">No resolved tickets yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Requester</th>
                  <th className="pb-2 font-medium">Resolution</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {closed.map(t => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{t.subject}</td>
                    <td className="py-2 text-gray-500">{t.users?.full_name ?? '—'}</td>
                    <td className="py-2 text-gray-500">{t.resolution_note ?? '—'}</td>
                    <td className="py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[t.status]}`}>{t.status}</span></td>
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
