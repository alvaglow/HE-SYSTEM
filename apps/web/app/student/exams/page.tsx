import { createClient } from '@/lib/supabase/server'
import ExamCalendarView from './ExamCalendarView'

export default async function StudentExamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: studentRaw } = await supabase.from('students').select('programme_id').eq('user_id', user!.id).single()
  const programmeId = (studentRaw as unknown as { programme_id: string | null } | null)?.programme_id ?? null

  const { data: examsRaw } = await supabase
    .from('exam_timetable')
    .select('id, exam_date, start_time, end_time, venue, notes, programme_id, subjects(name)')
    .eq('institution_id', institutionId)
    .order('exam_date', { ascending: true })

  const allExams = (examsRaw ?? []) as unknown as Array<{
    id: string; exam_date: string; start_time: string; end_time: string; venue: string | null; notes: string | null
    programme_id: string | null; subjects: { name: string } | null
  }>

  const exams = allExams.filter(e => !e.programme_id || e.programme_id === programmeId)

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-6">Exam Timetable</h1>
      <ExamCalendarView exams={exams} />
    </div>
  )
}
