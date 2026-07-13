import { createClient } from '@/lib/supabase/server'

export default async function TeacherStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: teacherRaw } = await supabase.from('teachers').select('id').eq('user_id', user!.id).single()
  const teacher = teacherRaw as unknown as { id: string } | null

  const { data: classesRaw } = await supabase
    .from('classes')
    .select('id, title, subjects(name), class_enrollments(students(id, student_number, users(full_name, email)))')
    .eq('teacher_id', teacher?.id ?? '')

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other portal page in this app.
  const classes = (classesRaw ?? []) as unknown as Array<{
    id: string; title: string | null; subjects: { name: string } | null
    class_enrollments: Array<{ students: { id: string; student_number: string; users: { full_name: string | null; email: string } | null } | null }>
  }>

  const rosterMap = new Map<string, { name: string; email: string; studentNumber: string; classes: Set<string> }>()
  for (const c of classes) {
    const label = c.title || c.subjects?.name || 'Class'
    for (const e of c.class_enrollments ?? []) {
      const s = e.students
      if (!s) continue
      if (!rosterMap.has(s.id)) {
        rosterMap.set(s.id, { name: s.users?.full_name ?? 'Student', email: s.users?.email ?? '', studentNumber: s.student_number, classes: new Set() })
      }
      rosterMap.get(s.id)!.classes.add(label)
    }
  }
  const roster = [...rosterMap.entries()].map(([id, v]) => ({ id, ...v, classList: [...v.classes].join(', ') }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Students</h1>
      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Roster ({roster.length})</h2>
        {roster.length === 0 ? (
          <p className="text-gray-400 text-sm">No students enrolled in your classes yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Student #</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Classes</th>
                </tr>
              </thead>
              <tbody>
                {roster.map(s => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{s.name}</td>
                    <td className="py-2 text-gray-500 font-mono text-xs">{s.studentNumber}</td>
                    <td className="py-2 text-gray-500">{s.email}</td>
                    <td className="py-2 text-gray-500">{s.classList}</td>
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
