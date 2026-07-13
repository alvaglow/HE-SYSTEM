import { createClient } from '@/lib/supabase/server'

const GRADE_STYLES: Record<string, string> = {
  A: 'bg-green-50 text-green-700',
  B: 'bg-blue-50 text-brand-blue',
  C: 'bg-yellow-50 text-yellow-700',
  D: 'bg-orange-50 text-orange-700',
  F: 'bg-red-50 text-brand-red',
}

export default async function ManagementKpiPage() {
  const supabase = await createClient()
  const now = new Date()

  const { data: recordsRaw } = await supabase
    .from('kpi_records')
    .select('id, period_year, period_month, total_score, grade, users(full_name, role)')
    .eq('period_year', now.getFullYear())
    .eq('period_month', now.getMonth() + 1)
    .order('total_score', { ascending: false })

  const records = (recordsRaw ?? []) as unknown as Array<{
    id: string; period_year: number; period_month: number; total_score: number | null; grade: string | null
    users: { full_name: string | null; role: string | null } | null
  }>

  const scores = records.map(r => Number(r.total_score)).filter(n => !Number.isNaN(n))
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

  const gradeCounts = new Map<string, number>()
  for (const r of records) {
    if (r.grade) gradeCounts.set(r.grade, (gradeCounts.get(r.grade) ?? 0) + 1)
  }

  const top5 = records.slice(0, 5)
  const bottom5 = [...records].reverse().slice(0, 5)

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-gray-900 mb-8">KPI Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="card border-t-4 border-purple-500">
          <p className="text-xs text-gray-500 mb-1">Average Score (This Month)</p>
          <p className="text-3xl font-display font-bold text-purple-600">{avgScore != null ? `${avgScore}%` : '—'}</p>
        </div>
        <div className="card border-t-4 border-brand-blue">
          <p className="text-xs text-gray-500 mb-1">Records This Month</p>
          <p className="text-3xl font-display font-bold text-brand-blue">{records.length}</p>
        </div>
        <div className="card border-t-4 border-green-500">
          <p className="text-xs text-gray-500 mb-1">Grade Distribution</p>
          <div className="flex gap-2 mt-1">
            {['A', 'B', 'C', 'D', 'F'].map(g => (
              <span key={g} className={`text-xs px-2 py-0.5 rounded-full ${GRADE_STYLES[g]}`}>
                {g}: {gradeCounts.get(g) ?? 0}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Top Performers</h2>
          {top5.length === 0 ? (
            <p className="text-gray-400 text-sm">No KPI records yet this month.</p>
          ) : (
            <div className="space-y-2">
              {top5.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{r.users?.full_name ?? '—'} <span className="text-gray-400 text-xs">({r.users?.role})</span></span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-brand-blue">{r.total_score != null ? Number(r.total_score).toFixed(1) : '—'}</span>
                    {r.grade && <span className={`text-xs px-2 py-0.5 rounded-full ${GRADE_STYLES[r.grade] ?? 'bg-gray-100 text-gray-500'}`}>{r.grade}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Needs Attention</h2>
          {bottom5.length === 0 ? (
            <p className="text-gray-400 text-sm">No KPI records yet this month.</p>
          ) : (
            <div className="space-y-2">
              {bottom5.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{r.users?.full_name ?? '—'} <span className="text-gray-400 text-xs">({r.users?.role})</span></span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-brand-blue">{r.total_score != null ? Number(r.total_score).toFixed(1) : '—'}</span>
                    {r.grade && <span className={`text-xs px-2 py-0.5 rounded-full ${GRADE_STYLES[r.grade] ?? 'bg-gray-100 text-gray-500'}`}>{r.grade}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
