import { createClient } from '@/lib/supabase/server'

export default async function TeacherTimetablePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: teacherRaw } = await supabase.from('teachers').select('id').eq('user_id', user!.id).single()
  const teacher = teacherRaw as unknown as { id: string } | null

  const nowIso = new Date().toISOString()
  const { data: classesRaw } = await supabase
    .from('classes')
    .select('id, title, starts_at, ends_at, class_type, location_name, room_number, join_url, subjects(name)')
    .eq('teacher_id', teacher?.id ?? '')
    .eq('is_cancelled', false)
    .gte('starts_at', nowIso)
    .order('starts_at', { ascending: true })
    .limit(50)

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other portal page in this app.
  const classes = (classesRaw ?? []) as unknown as Array<{
    id: string; title: string | null; starts_at: string; ends_at: string; class_type: string
    location_name: string | null; room_number: string | null; join_url: string | null
    subjects: { name: string } | null
  }>

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
