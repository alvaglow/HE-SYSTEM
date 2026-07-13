import { createClient } from '@/lib/supabase/server'
import { calculateCgpa } from '@he-system/shared/utils/gpa-calculator'

export default async function ParentTranscriptPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const institutionId = (meRaw as unknown as { institution_id: string } | null)?.institution_id ?? ''
  const { data: institutionRaw } = await supabase.from('institutions').select('name').eq('id', institutionId).single()
  const institutionName = (institutionRaw as unknown as { name: string } | null)?.name ?? 'HE-SYSTEM'

  const { data: linksRaw } = await supabase
    .from('parent_student_links')
    .select('students(id, student_number, intake_date, users(full_name), programmes(name))')
    .eq('parent_user_id', user!.id)
  const links = (linksRaw ?? []) as unknown as Array<{
    students: {
      id: string; student_number: string | null; intake_date: string | null
      users: { full_name: string | null } | null; programmes: { name?: string } | null
    } | null
  }>
  const children = links.map(l => l.students).filter((s): s is NonNullable<typeof s> => !!s)

  const childData = await Promise.all(
    children.map(async child => {
      const { data: resultsRaw } = await supabase
        .from('exam_results')
        .select('id, subject_id, grade, assessment_type, exam_date, subjects(name, code, credit_hours)')
        .eq('student_id', child.id)
        .eq('is_published', true)
      const examResultRows = (resultsRaw ?? []) as unknown as Array<{
        id: string; subject_id: string; grade: string | null; assessment_type: string | null; exam_date: string | null
        subjects: { name: string; code: string | null; credit_hours: number | null } | null
      }>
      const cgpaResult = calculateCgpa(examResultRows.map(r => ({
        subjectId: r.subject_id,
        subjectName: r.subjects?.name ?? 'Subject',
        subjectCode: r.subjects?.code,
        creditHours: Number(r.subjects?.credit_hours ?? 0),
        grade: r.grade,
        assessmentType: r.assessment_type,
        examDate: r.exam_date,
      })))
      return { child, cgpaResult }
    })
  )

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8 no-print">Interim Transcript</h1>
      {childData.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No children linked to your account yet. Contact admin.</div>
      ) : (
        childData.map(({ child, cgpaResult }) => (
          <div key={child.id} className="card max-w-3xl mx-auto mb-8 print:shadow-none print:border-0">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-brand-blue">{institutionName}</h2>
              <p className="text-sm text-gray-500 mt-1">Interim Academic Transcript</p>
              <p className="text-xs text-gray-400 mt-1">Generated {new Date().toLocaleDateString()} — not an official document</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
              <div><span className="text-gray-500">Name:</span> <span className="text-gray-800 font-medium">{child.users?.full_name ?? '—'}</span></div>
              <div><span className="text-gray-500">Student ID:</span> <span className="text-gray-800 font-medium">{child.student_number ?? '—'}</span></div>
              <div><span className="text-gray-500">Programme:</span> <span className="text-gray-800 font-medium">{child.programmes?.name ?? '—'}</span></div>
              <div><span className="text-gray-500">Intake:</span> <span className="text-gray-800 font-medium">{child.intake_date ? new Date(child.intake_date).toLocaleDateString() : '—'}</span></div>
            </div>

            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-medium">Code</th>
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Credit Hours</th>
                  <th className="pb-2 font-medium">Grade</th>
                </tr>
              </thead>
              <tbody>
                {cgpaResult.subjects.length === 0 ? (
                  <tr><td colSpan={4} className="py-4 text-gray-400 text-center">No published final results yet.</td></tr>
                ) : cgpaResult.subjects.map(s => (
                  <tr key={s.subjectId} className="border-b border-gray-100">
                    <td className="py-2 text-gray-500">{s.subjectCode ?? '—'}</td>
                    <td className="py-2 text-gray-800">{s.subjectName}</td>
                    <td className="py-2 text-gray-500">{s.creditHours}</td>
                    <td className="py-2 font-medium text-gray-800">{s.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center border-t border-gray-200 pt-4">
              <span className="text-sm text-gray-500">Total Credit Hours: {cgpaResult.totalCreditHours}</span>
              <span className="text-lg font-display font-bold text-brand-blue">
                CGPA: {cgpaResult.cgpa !== null ? cgpaResult.cgpa : 'In progress'}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
