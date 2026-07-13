import { createClient } from '@/lib/supabase/server'

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-green-50 text-green-700',
  late: 'bg-yellow-50 text-yellow-700',
  absent: 'bg-red-50 text-brand-red',
  excused: 'bg-blue-50 text-brand-blue',
}

export default async function ParentAttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: linksRaw } = await supabase
    .from('parent_student_links')
    .select('students(id, users(full_name))')
    .eq('parent_user_id', user!.id)

  const links = (linksRaw ?? []) as unknown as Array<{ students: { id: string; users: { full_name: string | null } | null } | null }>
  const children = links.map(l => l.students).filter((s): s is { id: string; users: { full_name: string | null } | null } => !!s)

  const childRecords = await Promise.all(
    children.map(async child => {
      const { data: recordsRaw } = await supabase
        .from('attendance_records')
        .select('id, status, marked_at, classes(title, subjects(name))')
        .eq('student_id', child.id)
        .order('marked_at', { ascending: false })
        .limit(50)
      const records = (recordsRaw ?? []) as unknown as Array<{
        id: string; status: string; marked_at: string | null
        classes: { title: string | null; subjects: { name: string } | null } | null
      }>
      const total = records.length
      const present = records.filter(r => r.status === 'present' || r.status === 'late').length
      const pct = total > 0 ? Math.round((present / total) * 100) : null
      return { child, records, pct }
    })
  )

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Attendance</h1>
      {childRecords.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No children linked to your account yet. Contact admin.</div>
      ) : (
        childRecords.map(({ child, records, pct }) => (
          <div key={child.id} className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-brand-blue">{child.users?.full_name ?? 'Child'}</h2>
              <span className="text-sm font-semibold text-brand-blue">{pct != null ? `${pct}% attendance` : 'No records yet'}</span>
            </div>
            {records.length === 0 ? (
              <p className="text-gray-400 text-sm">No attendance records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Class</th>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.id} className="border-b border-gray-50">
                        <td className="py-2 text-gray-700">{r.classes?.title || r.classes?.subjects?.name || '—'}</td>
                        <td className="py-2 text-gray-500">{r.marked_at ? new Date(r.marked_at).toLocaleString() : '—'}</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {r.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
