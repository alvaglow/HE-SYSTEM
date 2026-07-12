import { createClient } from '@/lib/supabase/server'
import AddStudentForm from './AddStudentForm'

export default async function AdminStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: studentsRaw } = await supabase
    .from('students')
    .select('id, student_number, is_active, created_at, users(full_name, email), programmes(name)')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false })

  // AUDIT FIX (build): embedded-relation selects can collapse to `never` under
  // this project's generated Database types (same issue seen across every
  // dashboard page) — cast once here rather than fighting the generated types.
  const students = (studentsRaw ?? []) as unknown as Array<{
    id: string
    student_number: string
    is_active: boolean | null
    created_at: string
    users: { full_name: string | null; email: string } | null
    programmes: { name: string } | null
  }>

  const { data: programmesRaw } = await supabase
    .from('programmes')
    .select('id, name')
    .eq('institution_id', institutionId)
    .eq('is_active', true)
  const programmes = (programmesRaw ?? []) as unknown as Array<{ id: string; name: string }>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-brand-blue">Students</h1>
      </div>

      <AddStudentForm programmes={programmes} />

      <div className="card mt-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">
          All Students ({students.length})
        </h2>
        {students.length === 0 ? (
          <p className="text-gray-400 text-sm">No students yet. Add the first one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Student No.</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Programme</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{s.student_number}</td>
                    <td className="py-2 text-gray-700">{s.users?.full_name ?? '—'}</td>
                    <td className="py-2 text-gray-500">{s.users?.email ?? '—'}</td>
                    <td className="py-2 text-gray-500">{s.programmes?.name ?? '—'}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
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
