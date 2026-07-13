import { createClient } from '@/lib/supabase/server'
import EnrollForm from './EnrollForm'

export default async function AdminEnrolmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: enrollmentsRaw } = await supabase
    .from('class_enrollments')
    .select('id, enrolled_at, is_active, students(users(full_name)), classes(title, starts_at, subjects(name))')
    .order('enrolled_at', { ascending: false })
    .limit(200)

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other admin page in this app.
  const enrollments = (enrollmentsRaw ?? []) as unknown as Array<{
    id: string; enrolled_at: string | null; is_active: boolean | null
    students: { users: { full_name: string | null } | null } | null
    classes: { title: string | null; starts_at: string; subjects: { name: string } | null } | null
  }>

  const { data: studentsRaw } = await supabase
    .from('students').select('id, users(full_name)').eq('institution_id', institutionId).eq('is_active', true)
  const students = ((studentsRaw ?? []) as unknown as Array<{ id: string; users: { full_name: string | null } | null }>)
    .map(s => ({ id: s.id, label: s.users?.full_name ?? 'Unnamed student' }))

  const { data: classesRaw } = await supabase
    .from('classes').select('id, title, starts_at, subjects(name)')
    .eq('institution_id', institutionId).eq('is_cancelled', false)
    .order('starts_at', { ascending: false })
    .limit(100)
  const classes = ((classesRaw ?? []) as unknown as Array<{ id: string; title: string | null; starts_at: string; subjects: { name: string } | null }>)
    .map(c => ({ id: c.id, label: `${c.title || c.subjects?.name || 'Class'} — ${new Date(c.starts_at).toLocaleDateString()}` }))

  async function deactivate(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const supabase = await createClient()
    await supabase.from('class_enrollments').update({ is_active: false } as unknown as never).eq('id', id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-brand-blue">Enrolment</h1>
      </div>

      <EnrollForm students={students} classes={classes} />

      <div className="card mt-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">
          Class Enrolments ({enrollments.length})
        </h2>
        {enrollments.length === 0 ? (
          <p className="text-gray-400 text-sm">No enrolments yet. Enrol a student above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Class</th>
                  <th className="pb-2 font-medium">Enrolled</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map(e => (
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{e.students?.users?.full_name ?? '—'}</td>
                    <td className="py-2 text-gray-500">{e.classes?.title || e.classes?.subjects?.name || '—'}</td>
                    <td className="py-2 text-gray-500">{e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : '—'}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${e.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {e.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2">
                      {e.is_active && (
                        <form action={deactivate}>
                          <input type="hidden" name="id" value={e.id} />
                          <button type="submit" className="text-xs text-brand-red hover:underline">Deactivate</button>
                        </form>
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
