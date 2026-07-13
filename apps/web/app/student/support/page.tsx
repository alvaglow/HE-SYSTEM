import { createClient } from '@/lib/supabase/server'
import TicketForm from './TicketForm'

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

export default async function SupportTicketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: ticketsRaw } = await supabase
    .from('support_tickets')
    .select('id, category, subject, description, status, priority, resolution_note, resolved_at, created_at')
    .eq('created_by', user!.id)
    .order('created_at', { ascending: false })

  const tickets = (ticketsRaw ?? []) as unknown as Array<{
    id: string; category: string; subject: string; description: string | null
    status: string; priority: string; resolution_note: string | null; resolved_at: string | null; created_at: string
  }>

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Support</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Submit a Ticket</h2>
        <TicketForm institutionId={institutionId} />
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">My Tickets ({tickets.length})</h2>
        {tickets.length === 0 ? (
          <p className="text-gray-400 text-sm">No tickets submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {tickets.map(t => (
              <div key={t.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{t.category} · {new Date(t.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[t.status]}`}>{t.status.replace('_', ' ')}</span>
                  </div>
                </div>
                {t.description && <p className="text-sm text-gray-500 mt-2">{t.description}</p>}
                {t.resolution_note && (
                  <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-2">
                    <strong>Resolution:</strong> {t.resolution_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
