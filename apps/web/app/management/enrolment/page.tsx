import { createClient } from '@/lib/supabase/server'

export default async function ManagementEnrolmentPage() {
  const supabase = await createClient()

  const [
    { count: activeCount },
    { count: totalCount },
    { data: recentRaw },
  ] = await Promise.all([
    supabase.from('class_enrollments').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('class_enrollments').select('*', { count: 'exact', head: true }),
    supabase
      .from('class_enrollments')
      .select('id, enrolled_at, is_active, students(users(full_name)), classes(title, subjects(name, programmes(name)))')
      .order('enrolled_at', { ascending: false })
      .limit(100),
  ])

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other portal page in this app.
  const recent = (recentRaw ?? []) as unknown as Array<{
    id: string; enrolled_at: string | null; is_active: boolean | null
    students: { users: { full_name: string | null } | null } | null
    classes: { title: string | null; subjects: { name: string; programmes: { name: string } | null } | null } | null
  }>

  const byProgramme = new Map<string, number>()
  for (const e of recent) {
    if (!e.is_active) continue
    const label = e.classes?.subjects?.programmes?.name ?? e.classes?.subjects?.name ?? 'Unassigned'
    byProgramme.set(label, (byProgramme.get(label) ?? 0) + 1)
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const newThisMonth = recent.filter(e => e.enrolled_at && new Date(e.enrolled_at) >= monthStart).length

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-gray-900 mb-8">Enrolment Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="card border-t-4 border-brand-blue">
          <p className="text-xs text-gray-500 mb-1">Active Enrolments</p>
          <p className="text-3xl font-display font-bold text-brand-blue">{activeCount ?? '—'}</p>
        </div>
        <div className="card border-t-4 border-green-500">
          <p className="text-xs text-gray-500 mb-1">New This Month</p>
          <p className="text-3xl font-display font-bold text-green-600">{newThisMonth}</p>
        </div>
        <div className="card border-t-4 border-purple-500">
          <p className="text-xs text-gray-500 mb-1">All-Time Total</p>
          <p className="text-3xl font-display font-bold text-purple-600">{totalCount ?? '—'}</p>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">By Programme (recent 100)</h2>
        {byProgramme.size === 0 ? (
          <p className="text-gray-400 text-sm">No active enrolments to break down yet.</p>
        ) : (
          <div className="space-y-2">
            {[...byProgramme.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{label}</span>
                <span className="font-semibold text-brand-blue">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Recent Enrolments ({recent.length})</h2>
        {recent.length === 0 ? (
          <p className="text-gray-400 text-sm">No enrolments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Class</th>
                  <th className="pb-2 font-medium">Enrolled</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.slice(0, 30).map(e => (
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{e.students?.users?.full_name ?? '—'}</td>
                    <td className="py-2 text-gray-500">{e.classes?.title || e.classes?.subjects?.name || '—'}</td>
                    <td className="py-2 text-gray-500">{e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : '—'}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${e.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {e.is_active ? 'Active' : 'Inactive'}
                      </span>
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
