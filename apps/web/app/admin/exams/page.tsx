import { createClient } from '@/lib/supabase/server'
import ExamsManager from './ExamsManager'

export default async function AdminExamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: examsRaw } = await supabase
    .from('exam_timetable')
    .select('id, exam_date, start_time, end_time, venue, notes, subjects(name), programmes(name)')
    .eq('institution_id', institutionId)
    .order('exam_date', { ascending: true })

  const exams = (examsRaw ?? []) as unknown as Array<{
    id: string; exam_date: string; start_time: string; end_time: string; venue: string | null; notes: string | null
    subjects: { name: string } | null; programmes: { name: string } | null
  }>

  const { data: subjectsRaw } = await supabase
    .from('subjects').select('id, name').eq('institution_id', institutionId).eq('is_active', true)
  const subjects = ((subjectsRaw ?? []) as unknown as Array<{ id: string; name: string }>)

  const { data: programmesRaw } = await supabase
    .from('programmes').select('id, name').eq('institution_id', institutionId)
  const programmes = ((programmesRaw ?? []) as unknown as Array<{ id: string; name: string }>)

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-6">Exam Timetable</h1>
      <ExamsManager institutionId={institutionId} exams={exams} subjects={subjects} programmes={programmes} />
    </div>
  )
}
