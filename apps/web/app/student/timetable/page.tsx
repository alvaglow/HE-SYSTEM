import { createClient } from '@/lib/supabase/server'

export default async function StudentTimetablePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', user!.id).single()
  const student = studentRaw as unknown as { id: string } | null
  const studentId = student?.id ?? ''

  const nowIso = new Date().toISOString()
  const { data: enrollmentsRaw } = await supabase
    .from('class_enrollments')
    .select('classes(id, title, starts_at, ends_at, class_type, location_name, room_number, join_url, is_cancelled, subjects(name))')
    .eq('student_id', studentId)

  const enrollments = (enrollmentsRaw ?? []) as unknown as Array<{
    classes: {
      id: string; title: string | null; starts_at: string; ends_at: string; class_type: string
      location_name: string | null; room_number: string | null; join_url: string | null; is_cancelled: boolean
      subjects: { name: string } | null
    } | null
  }>

  const classes = enrollments
    .map(e => e.classes)
    .filter((c): c is NonNullable<typeof c> => !!c && !c.is_cancelled && c.starts_at >= nowIso)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 50)

  const byDay = new Map<string, typeof classes>()
  for (const c of classes) {
    const day = new Date(c.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(c)
  }

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Timetable</h1>
      {byDay.size === 0 ? (
        <div className="card text-center py-12 text-gray-400">No upcoming classes scheduled.</div>
      ) : (
        [...byDay.entries()].map(([day, dayClasses]) => (
          <div key={day} className="card mb-4">
            <h2 className="text-sm font-display font-semibold text-brand-blue mb-3">{day}</h2>
            <ul className="space-y-3">
              {dayClasses.map(c => (
                <li key={c.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-gray-700 font-medium">{c.title || c.subjects?.name || 'Class'}</p>
                    <p className="text-xs text-gray-500">
                      {c.class_type === 'remote' ? 'Online' : (c.location_name || c.room_number || 'On campus')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-700">
                      {new Date(c.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {' – '}
                      {new Date(c.ends_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                    {c.class_type === 'remote' && c.join_url && (
                      <a href={c.join_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue hover:underline">
                        Join link
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}
