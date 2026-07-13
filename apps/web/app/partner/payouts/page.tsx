import { createClient } from '@/lib/supabase/server'
import RequestPayoutForm from './RequestPayoutForm'

const STATUS_STYLES: Record<string, string> = {
  requested: 'bg-yellow-50 text-yellow-700',
  processing: 'bg-blue-50 text-brand-blue',
  completed: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-brand-red',
}

export default async function PartnerPayoutsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: partnerRaw } = await supabase.from('partners').select('id, institution_id').eq('user_id', user!.id).single()
  const partner = partnerRaw as unknown as { id: string; institution_id: string } | null
  const partnerId = partner?.id ?? ''
  const institutionId = partner?.institution_id ?? ''

  const [{ data: commissionsRaw }, { data: payoutsRaw }] = await Promise.all([
    supabase.from('partner_commissions').select('amount_earned, status').eq('partner_id', partnerId),
    supabase.from('partner_payouts').select('id, amount, currency, status, requested_at, processed_at, notes, bank_reference, receipt_url').eq('partner_id', partnerId).order('requested_at', { ascending: false }),
  ])

  const commissions = (commissionsRaw ?? []) as unknown as Array<{ amount_earned: number; status: string | null }>
  const payouts = (payoutsRaw ?? []) as unknown as Array<{
    id: string; amount: number; currency: string; status: string | null; requested_at: string; processed_at: string | null; notes: string | null
    bank_reference: string | null; receipt_url: string | null
  }>

  const approvedCommissions = commissions
    .filter(c => c.status === 'approved' || c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.amount_earned), 0)
  const alreadyClaimed = payouts
    .filter(p => p.status !== 'rejected')
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const available = Math.max(0, approvedCommissions - alreadyClaimed)

  // receipt_url stores the storage object path (not a public URL, since the
  // 'receipts' bucket is private) — sign it for display here.
  const receiptUrls = new Map<string, string>()
  await Promise.all(payouts.filter(p => p.receipt_url).map(async p => {
    const { data } = await supabase.storage.from('receipts').createSignedUrl(p.receipt_url!, 3600)
    if (data?.signedUrl) receiptUrls.set(p.id, data.signedUrl)
  }))

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Payouts</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        <div className="card border-l-4 border-green-500">
          <p className="text-xs text-gray-500 mb-1">Available to Withdraw</p>
          <p className="text-2xl font-display font-bold text-green-600">RM{available.toLocaleString()}</p>
        </div>
        <div className="card border-l-4 border-brand-blue">
          <p className="text-xs text-gray-500 mb-1">Already Claimed</p>
          <p className="text-2xl font-display font-bold text-brand-blue">RM{alreadyClaimed.toLocaleString()}</p>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Request a Payout</h2>
        <RequestPayoutForm partnerId={partnerId} institutionId={institutionId} available={available} />
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">History ({payouts.length})</h2>
        {payouts.length === 0 ? (
          <p className="text-gray-400 text-sm">No payout requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Requested</th>
                  <th className="pb-2 font-medium">Processed</th>
                  <th className="pb-2 font-medium">Receipt</th>
                  <th className="pb-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{p.currency} {Number(p.amount).toLocaleString()}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status ?? 'requested']}`}>
                        {(p.status ?? 'requested').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{new Date(p.requested_at).toLocaleDateString()}</td>
                    <td className="py-2 text-gray-500">{p.processed_at ? new Date(p.processed_at).toLocaleDateString() : '—'}</td>
                    <td className="py-2 text-gray-500">
                      {receiptUrls.has(p.id) ? <a href={receiptUrls.get(p.id)} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline">View</a> : '—'}
                    </td>
                    <td className="py-2 text-gray-500">{p.notes ?? '—'}</td>
                  </tr