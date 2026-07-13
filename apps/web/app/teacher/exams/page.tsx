import { createClient } from '@/lib/supabase/server'

export default async function TeacherExamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const institutionId = (meRaw as unknown as { institution_id: string } | null)?.institution_id ?? ''

  const { data: examsRaw } = await supabase
    .from('exam_timetable')
    .select('id, exam_date, start_time, end_time, venue, notes, subjects(name)')
    .eq('institution_id', institutionId)
    .order('exam_date', { ascending: true })

  const exams = (examsRaw ?? []) as unknown as Array<{
    id: string; exam_date: string; start_time: string; end_time: string; venue: string | null; notes: string | null
    subjects: { name: string } | null
  }>

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-6">Exam Timetable</h1>
      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Upcoming Exams ({exams.length})</h2>
        {exams.length === 0 ? (
          <p className="text-gray-400 text-sm">No exams scheduled yet.</p>
        ) : (
          <ul className="space-y-3">
            {exams.map(e => (
              <li key={e.id} className="flex justify-between items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-gray-800">{e.subjects?.name ?? 'Exam'}</p>
                  <p className="text-sm text-gray-500">{e.venue ?? 'Venue TBA'}</p>
                  {e.notes && <p className="text-xs text-gray-400 mt-1">{e.notes}</p>}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm text-gray-700">{new Date(e.exam_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  <p className="text-xs text-gray-400">{e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
