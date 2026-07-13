import { createClient } from '@/lib/supabase/server'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-blue-50 text-brand-blue',
  paid: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-100 text-gray-400',
}

export default async function PartnerCommissionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: partnerRaw } = await supabase.from('partners').select('id').eq('user_id', user!.id).single()
  const partner = partnerRaw as unknown as { id: string } | null
  const partnerId = partner?.id ?? ''

  const { data: commissionsRaw } = await supabase
    .from('partner_commissions')
    .select('id, students_at_time, commission_pct, tuition_fee, amount_earned, tier_at_time, status, calculated_at, partner_recruits(student_name)')
    .eq('partner_id', partnerId)
    .order('calculated_at', { ascending: false })

  const commissions = (commissionsRaw ?? []) as unknown as Array<{
    id: string; students_at_time: number; commission_pct: number; tuition_fee: number; amount_earned: number
    tier_at_time: string; status: string | null; calculated_at: string
    partner_recruits: { student_name: string | null } | null
  }>

  const totals = commissions.reduce(
    (acc, c) => {
      const amt = Number(c.amount_earned)
      if (c.status === 'paid') acc.paid += amt
      else if (c.status === 'approved') acc.approved += amt
      else if (c.status === 'pending') acc.pending += amt
      return acc
    },
    { paid: 0, approved: 0, pending: 0 }
  )

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Commission</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="card border-l-4 border-green-500">
          <p className="text-xs text-gray-500 mb-1">Paid Out</p>
          <p className="text-2xl font-display font-bold text-green-600">RM{totals.paid.toLocaleString()}</p>
        </div>
        <div className="card border-l-4 border-brand-blue">
          <p className="text-xs text-gray-500 mb-1">Approved (Withdrawable)</p>
          <p className="text-2xl font-display font-bold text-brand-blue">RM{totals.approved.toLocaleString()}</p>
        </div>
        <div className="card border-l-4 border-yellow-500">
          <p className="text-xs text-gray-500 mb-1">Pending Review</p>
          <p className="text-2xl font-display font-bold text-yellow-600">RM{totals.pending.toLocaleString()}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">History ({commissions.length})</h2>
        {commissions.length === 0 ? (
          <p className="text-gray-400 text-sm">No commissions recorded yet. Refer a student to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Tuition</th>
                  <th className="pb-2 font-medium">Rate</th>
                  <th className="pb-2 font-medium">Earned</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map(c => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{c.partner_recruits?.student_name ?? '—'}</td>
                    <td className="py-2 text-gray-500">RM{Number(c.tuition_fee).toLocaleString()}</td>
                    <td className="py-2 text-gray-500">{c.commission_pct}%</td>
                    <td className="py-2 text-gray-700">RM{Number(c.amount_earned).toLocaleString()}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status ?? 'pending']}`}>
                        {(c.status ?? 'pending').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{new Date(c.calculated_at).toLocaleDateString()}</td>
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
