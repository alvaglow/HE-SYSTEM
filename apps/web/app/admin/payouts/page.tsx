import { createClient } from '@/lib/supabase/server'
import PayoutDecisionForm from './PayoutDecisionForm'

const STATUS_STYLES: Record<string, string> = {
  requested: 'bg-yellow-50 text-yellow-700',
  processing: 'bg-blue-50 text-brand-blue',
  completed: 'bg-green-50 text-green-700',
  rejected: 'bg-brand-red/10 text-brand-red',
}

export default async function AdminPayoutsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: payoutsRaw } = await supabase
    .from('partner_payouts')
    .select('id, amount, currency, status, requested_at, processed_at, notes, bank_reference, receipt_url, partners(company_name, users(full_name, email))')
    .eq('institution_id', institutionId)
    .order('requested_at', { ascending: false })
    .limit(100)

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other admin page in this app.
  const payouts = (payoutsRaw ?? []) as unknown as Array<{
    id: string; amount: number; currency: string; status: string | null
    requested_at: string; processed_at: string | null; notes: string | null
    bank_reference: string | null; receipt_url: string | null
    partners: { company_name: string | null; users: { full_name: string | null; email: string } | null } | null
  }>

  const receiptUrls = new Map<string, string>()
  await Promise.all(payouts.filter(p => p.receipt_url).map(async p => {
    const { data } = await supabase.storage.from('receipts').createSignedUrl(p.receipt_url!, 3600)
    if (data?.signedUrl) receiptUrls.set(p.id, data.signedUrl)
  }))

  const pending = payouts.filter(p => p.status === 'requested' || p.status === 'processing')
  const decided = payouts.filter(p => p.status === 'completed' || p.status === 'rejected')

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Partner Payouts</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">
          Pending / Processing ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-gray-400 text-sm">No pending payout requests.</p>
        ) : (
          <div className="space-y-4">
            {pending.map(p => (
              <div key={p.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {p.partners?.company_name || p.partners?.users?.full_name || 'Partner'}
                    </p>
                    <p className="text-xs text-gray-400">{p.partners?.users?.email}</p>
                    <p className="text-lg font-display font-bold text-brand-blue mt-1">{p.currency} {Number(p.amount).toLocaleString()}</p>
                    {p.bank_reference && <p className="text-xs text-gray-500 mt-1">Bank ref: {p.bank_reference}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status ?? 'requested']}`}>
                    {(p.status ?? 'requested').toUpperCase()}
                  </span>
                </div>
                <PayoutDecisionForm payoutId={p.id} institutionId={institutionId} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">History ({decided.length})</h2>
        {decided.length === 0 ? (
          <p className="text-gray-400 text-sm">No completed or rejected payouts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Partner</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Processed</th>
                  <th className="pb-2 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {decided.map(p => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{p.partners?.company_name || p.partners?.users?.full_name || '—'}</td>
                    <td className="py-2 text-gray-700">{p.currency} {Number(p.amount).toLocaleString()}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status ?? 'requested']}`}>
                        {(p.status ?? 'requested').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{p.processed_at ? new Date(p.processed_at).toLocaleDateString() : '—'}</td>
                    <td className="py-2 text-gray-500">
                      {receiptUrls.has(p.id) ? <a href={receiptUrls.get(p.id)} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline">View</a> : '—'}
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
