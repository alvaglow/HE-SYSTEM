import { createClient } from '@/lib/supabase/server'
import AddStaffForm from './AddStaffForm'

export default async function AdminStaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const [{ data: teachersRaw }, { data: staffRaw }] = await Promise.all([
    supabase.from('teachers').select('id, employee_number, is_active, users(full_name, email)').eq('institution_id', institutionId),
    supabase.from('staff').select('id, employee_number, position, is_active, users(full_name, email)').eq('institution_id', institutionId),
  ])

  const teachers = (teachersRaw ?? []) as unknown as Array<{
    id: string; employee_number: string; is_active: boolean | null
    users: { full_name: string | null; email: string } | null
  }>
  const staff = (staffRaw ?? []) as unknown as Array<{
    id: string; employee_number: string; position: string | null; is_active: boolean | null
    users: { full_name: string | null; email: string } | null
  }>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-brand-blue">Staff</h1>
      </div>

      <AddStaffForm />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Teachers ({teachers.length})</h2>
          {teachers.length === 0 ? (
            <p className="text-gray-400 text-sm">No teachers yet.</p>
          ) : (
            <ul className="space-y-2">
              {teachers.map(t => (
                <li key={t.id} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-700">{t.users?.full_name ?? '—'} <span className="text-gray-400">({t.employee_number})</span></span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Admin & Support Staff ({staff.length})</h2>
          {staff.length === 0 ? (
            <p className="text-gray-400 text-sm">No staff yet.</p>
          ) : (
            <ul className="space-y-2">
              {staff.map(s => (
                <li key={s.id} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-700">{s.users?.full_name ?? '—'} <span className="text-gray-400">({s.position ?? s.employee_number})</span></span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
