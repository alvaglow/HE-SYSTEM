import { createClient } from '@/lib/supabase/server'
import RecalculateButton from './RecalculateButton'

const GRADE_STYLES: Record<string, string> = {
  A: 'bg-green-50 text-green-700',
  B: 'bg-blue-50 text-brand-blue',
  C: 'bg-yellow-50 text-yellow-700',
  D: 'bg-orange-50 text-orange-700',
  F: 'bg-red-50 text-brand-red',
}

export default async function AdminKpiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: kpiRaw } = await supabase
    .from('kpi_records')
    .select('id, period_year, period_month, total_score, grade, classes_conducted, attendance_rate, tasks_completed, tasks_total, users(full_name)')
    .eq('institution_id', institutionId)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .limit(200)

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other admin page in this app.
  const records = (kpiRaw ?? []) as unknown as Array<{
    id: string; period_year: number; period_month: number
    total_score: number | null; grade: string | null
    classes_conducted: number | null; attendance_rate: number | null
    tasks_completed: number | null; tasks_total: number | null
    users: { full_name: string | null } | null
  }>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-brand-blue">KPI</h1>
      </div>

      <RecalculateButton />

      <div className="card mt-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">
          KPI Records ({records.length})
        </h2>
        {records.length === 0 ? (
          <p className="text-gray-400 text-sm">No KPI records yet. Run a recalculation above once teachers have taught classes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Teacher</th>
                  <th className="pb-2 font-medium">Period</th>
                  <th className="pb-2 font-medium">Classes</th>
                  <th className="pb-2 font-medium">Attendance</th>
                  <th className="pb-2 font-medium">Tasks</th>
                  <th className="pb-2 font-medium">Score</th>
                  <th className="pb-2 font-medium">Grade</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{r.users?.full_name ?? '—'}</td>
                    <td className="py-2 text-gray-500">{r.period_year}-{String(r.period_month).padStart(2, '0')}</td>
                    <td className="py-2 text-gray-500">{r.classes_conducted ?? '—'}</td>
                    <td className="py-2 text-gray-500">{r.attendance_rate != null ? `${Number(r.attendance_rate).toFixed(1)}%` : '—'}</td>
                    <td className="py-2 text-gray-500">{r.tasks_completed ?? 0}/{r.tasks_total ?? 0}</td>
                    <td className="py-2 text-gray-700">{r.total_score != null ? Number(r.total_score).toFixed(1) : '—'}</td>
                    <td className="py-2">
                      {r.grade && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${GRADE_STYLES[r.grade] ?? 'bg-gray-100 text-gray-500'}`}>
                          {r.grade}
                        </span>
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
