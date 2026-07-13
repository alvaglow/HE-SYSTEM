import { createClient } from '@/lib/supabase/server'
import { calculateCgpa } from '@he-system/shared/utils/gpa-calculator'
import Predictor from './Predictor'

export default async function GpaPredictorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', user!.id).single()
  const studentId = (studentRaw as unknown as { id: string } | null)?.id ?? ''

  const { data: resultsRaw } = await supabase
    .from('exam_results')
    .select('id, grade, assessment_type, exam_date, subject_id, subjects(name, code, credit_hours)')
    .eq('student_id', studentId)
    .eq('is_published', true)

  const results = (resultsRaw ?? []) as unknown as Array<{
    id: string; grade: string | null; assessment_type: string | null; exam_date: string | null
    subject_id: string; subjects: { name: string; code: string | null; credit_hours: number | null } | null
  }>

  const cgpaResult = calculateCgpa(results.map(r => ({
    subjectId: r.subject_id,
    subjectName: r.subjects?.name ?? 'Subject',
    subjectCode: r.subjects?.code,
    creditHours: Number(r.subjects?.credit_hours ?? 0),
    grade: r.grade,
    assessmentType: r.assessment_type,
    examDate: r.exam_date,
  })))

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-2">GPA What-If Predictor</h1>
      <p className="text-sm text-gray-500 mb-8">Simulate future courses and grades to see the projected impact on your CGPA.</p>
      <Predictor
        completed={cgpaResult.subjects.map(s => ({ subjectId: s.subjectId, subjectName: s.subjectName, subjectCode: s.subjectCode, creditHours: s.creditHours, grade: s.grade }))}
        currentCgpa={cgpaResult.cgpa}
        totalCreditsCompleted={cgpaResult.totalCreditHours}
      />
    </div>
  )
}
