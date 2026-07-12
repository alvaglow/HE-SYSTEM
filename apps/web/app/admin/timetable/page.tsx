import { createClient } from '@/lib/supabase/server'
import AddClassForm from './AddClassForm'

export default async function AdminTimetablePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: classesRaw } = await supabase
    .from('classes')
    .select('id, title, starts_at, ends_at, location_name, room_number, is_cancelled, checkin_method, subjects(name), teachers(users(full_name))')
    .eq('institution_id', institutionId)
    .order('starts_at', { ascending: false })
    .limit(100)

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other admin page in this app.
  const classes = (classesRaw ?? []) as unknown as Array<{
    id: string; title: string | null; starts_at: string; ends_at: string
    location_name: string | null; room_number: string | null
    is_cancelled: boolean | null; checkin_method: string | null
    subjects: { name: string } | null
    teachers: { users: { full_name: string | null } | null } | null
  }>

  const { data: subjectsRaw } = await supabase
    .from('subjects').select('id, name').eq('institution_id', institutionId).eq('is_active', true)
  const subjects = ((subjectsRaw ?? []) as unknown as Array<{ id: string; name: string }>)
    .map(s => ({ id: s.id, label: s.name }))

  const { data: teachersRaw } = await supabase
    .from('teachers').select('id, users(full_name)').eq('institution_id', institutionId).eq('is_active', true)
  const teachers = ((teachersRaw ?? []) as unknown as Array<{ id: string; users: { full_name: string | null } | null }>)
    .map(t => ({ id: t.id, label: t.users?.full_name ?? 'Unnamed teacher' }))

  async function cancelClass(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const supabase = await createClient()
    await supabase.from('classes').update({ is_cancelled: true } as unknown as never).eq('id', id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-brand-blue">Timetable</h1>
      </div>

      <AddClassForm institutionId={institutionId} subjects={subjects} teachers={teachers} />

      <div className="card mt-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">
          Scheduled Classes ({classes.length})
        </h2>
        {classes.length === 0 ? (
          <p className="text-gray-400 text-sm">No classes scheduled yet. Add the first one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Teacher</th>
                  <th className="pb-2 font-medium">Starts</th>
                  <th className="pb-2 font-medium">Ends</th>
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium">Check-in</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {classes.map(c => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{c.title || c.subjects?.name || '—'}</td>
                    <td className="py-2 text-gray-500">{c.teachers?.users?.full_name ?? '—'}</td>
                    <td className="py-2 text-gray-500">{new Date(c.starts_at).toLocaleString()}</td>
                    <td className="py-2 text-gray-500">{new Date(c.ends_at).toLocaleString()}</td>
                    <td className="py-2 text-gray-500">{[c.location_name, c.room_number].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="py-2 text-gray-500">{c.checkin_method === 'gps_biometric' ? 'GPS + biometric' : 'OTP'}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_cancelled ? 'bg-red-50 text-brand-red' : 'bg-green-50 text-green-700'}`}>
                        {c.is_cancelled ? 'Cancelled' : 'Scheduled'}
                      </span>
                    </td>
                    <td className="py-2">
                      {!c.is_cancelled && (
                        <form action={cancelClass}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="text-xs text-brand-red hover:underline">Cancel</button>
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
