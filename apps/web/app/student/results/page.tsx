import { createClient } from '@/lib/supabase/server'

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
    .select('id, score, max_score, grade, assessment_name, assessment_type, exam_date, subjects(name)')
    .eq('student_id', studentId)
    .eq('is_published', true)
    .order('exam_date', { ascending: false })

  const results = (resultsRaw ?? []) as unknown as Array<{
    id: string; score: number; max_score: number; grade: string | null; assessment_name: string; assessment_type: string | null
    exam_date: string | null; subjects: { name: string } | null
  }>

  const avgPct = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + (Number(r.score) / Number(r.max_score)) * 100, 0) / results.length)
    : 0

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Exam Results</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Average Score</p>
          <p className="text-2xl font-display font-bold text-brand-blue">{avgPct}%</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Published Results</p>
          <p className="text-2xl font-display font-bold text-gray-700">{results.length}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Results</h2>
        {results.length === 0 ? (
          <p className="text-gray-400 text-sm">No published results yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Assessment</th>
                  <th className="pb-2 font-medium">Score</th>
                  <th className="pb-2 font-medium">Grade</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{r.subjects?.name ?? '—'}</td>
                    <td className="py-2 text-gray-500">{r.assessment_name}{r.assessment_type ? ` (${r.assessment_type})` : ''}</td>
                    <td className="py-2 text-gray-700">{r.score} / {r.max_score}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${GRADE_STYLES[r.grade ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                        {r.grade ?? '—'}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{r.exam_date ? new Date(r.exam_date).toLocaleDateString() : '—'}</td>
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
