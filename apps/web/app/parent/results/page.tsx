import { createClient } from '@/lib/supabase/server'

export default async function ParentResultsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: linksRaw } = await supabase
    .from('parent_student_links')
    .select('students(id, users(full_name))')
    .eq('parent_user_id', user!.id)

  const links = (linksRaw ?? []) as unknown as Array<{ students: { id: string; users: { full_name: string | null } | null } | null }>
  const children = links.map(l => l.students).filter((s): s is { id: string; users: { full_name: string | null } | null } => !!s)

  const childResults = await Promise.all(
    children.map(async child => {
      const { data: resultsRaw } = await supabase
        .from('exam_results')
        .select('id, assessment_name, assessment_type, score, max_score, grade, exam_date, subjects(name)')
        .eq('student_id', child.id)
        .eq('is_published', true)
        .order('exam_date', { ascending: false })
      const results = (resultsRaw ?? []) as unknown as Array<{
        id: string; assessment_name: string; assessment_type: string | null; score: number | null; max_score: number | null
        grade: string | null; exam_date: string | null; subjects: { name: string } | null
      }>
      return { child, results }
    })
  )

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Results</h1>
      {childResults.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No children linked to your account yet. Contact admin.</div>
      ) : (
        childResults.map(({ child, results }) => (
          <div key={child.id} className="card mb-6">
            <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">{child.users?.full_name ?? 'Child'}</h2>
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
                        <td className="py-2 text-gray-500">{r.score != null && r.max_score != null ? `${r.score}/${r.max_score}` : '—'}</td>
                        <td className="py-2">
                          {r.grade && <span className="text-xs px-2 py-0.5 rounded-full bg-brand-blue-100 text-brand-blue">{r.grade}</span>}
                        </td>
                        <td className="py-2 text-gray-500">{r.exam_date ? new Date(r.exam_date).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
