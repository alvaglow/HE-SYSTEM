import { createClient } from '@/lib/supabase/server'
import { calculateCgpa } from '@he-system/shared/utils/gpa-calculator'

const GRADE_STYLES: Record<string, string> = {
  A: 'bg-green-50 text-green-700', B: 'bg-blue-50 text-brand-blue', C: 'bg-yellow-50 text-yellow-700',
  D: 'bg-orange-50 text-orange-700', F: 'bg-red-50 text-brand-red',
}

export default async function StudentResultsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', user!.id).single()
  const student = studentRaw as unknown as { id: string } | null
  const studentId = student?.id ?? ''

  const { data: resultsRaw } = await supabase
    .from('exam_results')
    .select('id, score, max_score, grade, assessment_name, assessment_type, exam_date, subject_id, subjects(name, code, credit_hours)')
    .eq('student_id', studentId)
    .eq('is_published', true)
    .order('exam_date', { ascending: false })

  const results = (resultsRaw ?? []) as unknown as Array<{
    id: string; score: number; max_score: number; grade: string | null; assessment_name: string; assessment_type: string | null
    exam_date: string | null; subject_id: string; subjects: { name: string; code: string | null; credit_hours: number | null } | null
  }>

  const avgPct = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + (Number(r.score) / Number(r.max_score)) * 100, 0) / results.length)
    : 0

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
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Exam Results</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="card border-l-4 border-purple-400">
          <p className="text-xs text-gray-500 mb-1">CGPA</p>
          <p className="text-2xl font-display font-bold text-purple-700">{cgpaResult.cgpa ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-1">{cgpaResult.totalCreditHours} credit hours completed</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Average Score</p>
          <p className="text-2xl font-display font-bold text-brand-blue">{avgPct}%</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Published Results</p>
          <p className="text-2xl font-display font-bold text-gray-700">{results.length}</p>
        </div>
      </div>

      {cgpaResult.subjects.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-lg font-display font-semibold text-purple-700 mb-4">Subject Grades (Finals)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Credit Hours</th>
                  <th className="pb-2 font-medium">Grade</th>
                  <th className="pb-2 font-medium">Grade Points</th>
                </tr>
              </thead>
              <tbody>
                {cgpaResult.subjects.map(s => (
                  <tr key={s.subjectId} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{s.subjectName}{s.subjectCode ? ` (${s.subjectCode})` 