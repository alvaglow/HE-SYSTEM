import { createClient } from '@/lib/supabase/server'

const TIER_STYLES: Record<string, string> = {
  platinum: 'bg-purple-50 text-purple-700',
  gold: 'bg-yellow-50 text-yellow-700',
  silver: 'bg-gray-100 text-gray-600',
  bronze: 'bg-orange-50 text-orange-700',
  starter: 'bg-blue-50 text-brand-blue',
}

export default async function PartnerLeaderboardPage() {
  const supabase = await createClient()

  const { data: partnersRaw } = await supabase.rpc('get_partner_leaderboard' as never)

  const partners = (partnersRaw ?? []) as unknown as Array<{
    id: string; company_name: string | null; full_name: string | null; tier: string | null
    total_recruited: number | null; is_self: boolean
  }>

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-2">Leaderboard</h1>
      <p className="text-gray-500 text-sm mb-8">Ranked by students recruited. Earnings are kept private between partners.</p>

      <div className="card">
        {partners.length === 0 ? (
          <p className="text-gray-400 text-sm">No partners to rank yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Rank</th>
                  <th className="pb-2 font-medium">Partner</th>
                  <th className="pb-2 font-medium">Tier</th>
                  <th className="pb-2 font-medium">Recruited</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p, i) => (
                  <tr key={p.id} className={`border-b border-gray-50 ${p.is_self ? 'bg-brand-blue-50/40' : ''}`}>
                    <td className="py-2 text-gray-700 font-semibold">#{i + 1}</td>
                    <td className="py-2 text-gray-700">
                      {p.company_name || p.full_name || '—'}
                      {p.is_self && <span className="ml-2 text-xs text-brand-blue">(You)</span>}
                    </td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_STYLES[p.tier ?? 'starter']}`}>
                        {(p.tier ?? 'starter').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{p.total_recruited ?? 0}</td>
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
