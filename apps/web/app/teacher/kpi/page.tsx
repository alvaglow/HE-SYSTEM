import { createClient } from '@/lib/supabase/server'

const GRADE_STYLES: Record<string, string> = {
  A: 'bg-green-50 text-green-700', B: 'bg-blue-50 text-brand-blue', C: 'bg-yellow-50 text-yellow-700',
  D: 'bg-orange-50 text-orange-700', F: 'bg-red-50 text-brand-red',
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default async function TeacherKpiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: kpiRaw } = await supabase
    .from('kpi_records')
    .select('id, period_year, period_month, pillar1_score, pillar2_score, pillar3_score, pillar4_score, total_score, grade, teaching_hours, classes_conducted, attendance_rate, pass_rate, tasks_completed, tasks_total, training_hours, notes')
    .eq('user_id', user!.id)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

  const records = (kpiRaw ?? []) as unknown as Array<{
    id: string; period_year: number; period_month: number
    pillar1_score: number | null; pillar2_score: number | null; pillar3_score: number | null; pillar4_score: number | null
    total_score: number | null; grade: string | null; teaching_hours: number | null; classes_conducted: number | null
    attendance_rate: number | null; pass_rate: number | null; tasks_completed: number | null; tasks_total: number | null
    training_hours: number | null; notes: string | null
  }>

  const latest = records[0]

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">My KPI</h1>

      {latest ? (
        <>
          <div className="card mb-6 border-l-4 border-brand-blue">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{MONTH_NAMES[latest.period_month]} {latest.period_year}</p>
                <p className="text-3xl font-display font-bold text-brand-blue">{latest.total_score ?? '—'}</p>
              </div>
              {latest.grade && (
                <span className={`text-sm px-3 py-1 rounded-full ${GRADE_STYLES[latest.grade] ?? 'bg-gray-100 text-gray-500'}`}>
                  {latest.grade}
                </span>
              )}
            </div>
          </div>

          <div className="card mb-6">
            <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Pillar Breakdown</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Pillar 1</p>
                <p className="text-xl font-display font-bold text-gray-700">{latest.pillar1_score ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Pillar 2</p>
                <p className="text-xl font-display font-bold text-gray-700">{latest.pillar2_score ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Pillar 3</p>
                <p className="text-xl font-display font-bold text-gray-700">{latest.pillar3_score ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Pillar 4</p>
                <p className="text-xl font-display font-bold text-gray-700">{latest.pillar4_score ?? '—'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Teaching Hours</p>
                <p className="text-lg font-display font-semibold text-gray-700">{latest.teaching_hours ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Classes Conducted</p>
                <p className="text-lg font-display font-semibold text-gray-700">{latest.classes_conducted ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Attendance Rate</p>
                <p className="text-lg font-display font-semibold text-gray-700">{latest.attendance_rate != null ? `${latest.attendance_rate}%` : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Pass Rate</p>
                <p className="text-lg font-display font-semibold text-gray-700">{latest.pass_rate != null ? `${latest.pass_rate}%` : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Tasks</p>
                <p className="text-lg font-display font-semibold text-gray-700">{latest.tasks_completed ?? 0} / {latest.tasks_total ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Training Hours</p>
                <p className="text-lg font-display font-semibold text-gray-700">{latest.training_hours ?? '—'}</p>
              </div>
            </div>
            {latest.notes && <p className="text-sm text-gray-500 mt-4 border-t border-gray-50 pt-4">{latest.notes}</p>}
          </div>
        </>
      ) : (
        <div className="card text-center py-12 text-gray-400 mb-6">No KPI data recorded yet.</div>
      )}

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">History ({records.length})</h2>
        {records.length === 0 ? (
          <p className="text-gray-400 text-sm">No history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Period</th>
                  <th className="pb-2 font-medium">Score</th>
                  <th className="pb-2 font-medium">Grade</th>
                  <th className="pb-2 font-medium">Attendance</th>
                  <th className="pb-2 font-medium">Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {records.map(k => (
                  <tr key={k.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{MONTH_NAMES[k.period_month]} {k.period_year}</td>
                    <td className="py-2 text-gray-700">{k.total_score ?? '—'}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${GRADE_STYLES[k.grade ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                        {k.grade ?? '—'}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{k.attendance_rate != null ? `${k.attendance_rate}%` : '—'}</td>
                    <td className="py-2 text-gray-500">{k.pass_rate != null ? `${k.pass_rate}%` : '—'}</td>
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
