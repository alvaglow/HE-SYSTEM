import { createClient } from '@/lib/supabase/server'

const TIER_STYLES: Record<string, string> = {
  platinum: 'bg-purple-50 text-purple-700',
  gold: 'bg-yellow-50 text-yellow-700',
  silver: 'bg-gray-100 text-gray-600',
  bronze: 'bg-orange-50 text-orange-700',
  starter: 'bg-blue-50 text-brand-blue',
}

export default async function ManagementPartnersPage() {
  const supabase = await createClient()

  const { data: partnersRaw } = await supabase
    .from('partners')
    .select('id, company_name, tier, total_recruited, total_earned, is_active, users(full_name)')
    .order('total_earned', { ascending: false })

  const partners = (partnersRaw ?? []) as unknown as Array<{
    id: string; company_name: string | null; tier: string | null
    total_recruited: number | null; total_earned: number | null; is_active: boolean | null
    users: { full_name: string | null } | null
  }>

  const tierCounts = new Map<string, number>()
  let totalEarned = 0
  for (const p of partners) {
    const tier = p.tier ?? 'starter'
    tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1)
    totalEarned += Number(p.total_earned ?? 0)
  }
  const activeCount = partners.filter(p => p.is_active).length
  const top10 = partners.slice(0, 10)

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-gray-900 mb-8">Partner Performance</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="card border-t-4 border-brand-blue">
          <p className="text-xs text-gray-500 mb-1">Active Partners</p>
          <p className="text-3xl font-display font-bold text-brand-blue">{activeCount} / {partners.length}</p>
        </div>
        <div className="card border-t-4 border-green-500">
          <p className="text-xs text-gray-500 mb-1">Total Commissions Paid</p>
          <p className="text-2xl font-display font-bold text-green-600">RM{totalEarned.toLocaleString()}</p>
        </div>
        <div className="card border-t-4 border-amber-500">
          <p className="text-xs text-gray-500 mb-1">Tier Distribution</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {['platinum', 'gold', 'silver', 'bronze', 'starter'].map(t => (
              <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${TIER_STYLES[t]}`}>
                {t}: {tierCounts.get(t) ?? 0}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Top 10 Earners</h2>
        {top10.length === 0 ? (
          <p className="text-gray-400 text-sm">No partners yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Tier</th>
                  <th className="pb-2 font-medium">Recruited</th>
                  <th className="pb-2 font-medium">Earned</th>
                </tr>
              </thead>
              <tbody>
                {top10.map(p => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{p.company_name || p.users?.full_name || '—'}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_STYLES[p.tier ?? 'starter']}`}>
                        {(p.tier ?? 'starter').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{p.total_recruited ?? 0}</td>
                    <td className="py-2 text-gray-700">RM{Number(p.total_earned ?? 0).toLocaleString()}</td>
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
