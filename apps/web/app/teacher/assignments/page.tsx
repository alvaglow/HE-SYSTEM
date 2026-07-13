import { createClient } from '@/lib/supabase/server'
import AssignmentForm from './AssignmentForm'

export default async function TeacherAssignmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: teacherRaw } = await supabase.from('teachers').select('id, institution_id').eq('user_id', user!.id).single()
  const teacher = teacherRaw as unknown as { id: string; institution_id: string } | null
  const teacherId = teacher?.id ?? ''
  const institutionId = teacher?.institution_id ?? ''

  const [{ data: assignmentsRaw }, { data: classesRaw }] = await Promise.all([
    supabase.from('assignments')
      .select('id, title, due_at, max_score, created_at, class_id, classes(title, subjects(name)), assignment_submissions(id, score)')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false }),
    supabase.from('classes')
      .select('id, title, subject_id, subjects(name), class_enrollments(id)')
      .eq('teacher_id', teacherId),
  ])

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other portal page in this app.
  const assignments = (assignmentsRaw ?? []) as unknown as Array<{
    id: string; title: string; due_at: string | null; max_score: number; created_at: string; class_id: string
    classes: { title: string | null; subjects: { name: string } | null } | null
    assignment_submissions: Array<{ id: string; score: number | null }>
  }>

  const classes = (classesRaw ?? []) as unknown as Array<{
    id: string; title: string | null; subject_id: string; subjects: { name: string } | null
    class_enrollments: Array<{ id: string }>
  }>

  const classOptions = classes.map(c => ({
    id: c.id,
    label: `${c.title || c.subjects?.name || 'Class'} (${c.class_enrollments?.length ?? 0} enrolled)`,
    subjectId: c.subject_id,
  }))

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Assignments</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">New Assignment</h2>
        <AssignmentForm teacherId={teacherId} institutionId={institutionId} classes={classOptions} />
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Your Assignments ({assignments.length})</h2>
        {assignments.length === 0 ? (
          <p className="text-gray-400 text-sm">No assignments created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Class</th>
                  <th className="pb-2 font-medium">Due</th>
                  <th className="pb-2 font-medium">Submissions</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(a => {
                  const graded = a.assignment_submissions.filter(s => s.score !== null).length
                  return (
                    <tr key={a.id} className="border-b border-gray-50">
                      <td className="py-2 text-gray-700">{a.title}</td>
                      <td className="py-2 text-gray-500">{a.classes?.title || a.classes?.subjects?.name || '—'}</td>
                      <td className="py-2 text-gray-500">{a.due_at ? new Date(a.due_at).toLocaleString() : 'No due date'}</td>
                      <td className="py-2 text-gray-500">{a.assignment_submissions.length} submitted · {graded} graded</td>
                      <td className="py-2">
                        <a href={`/teacher/assignments/${a.id}`} className="text-xs text-brand-blue hover:underline">Grade</a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
