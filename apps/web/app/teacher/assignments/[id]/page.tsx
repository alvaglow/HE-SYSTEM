import { createClient } from '@/lib/supabase/server'
import GradeForm from './GradeForm'

export default async function GradeAssignmentPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: teacherRaw } = await supabase.from('teachers').select('id').eq('user_id', user!.id).single()
  const teacherId = (teacherRaw as unknown as { id: string } | null)?.id ?? ''

  const { data: assignmentRaw } = await supabase
    .from('assignments')
    .select('id, title, description, due_at, max_score, class_id, classes(title, subjects(name), class_enrollments(students(id, student_number, users(full_name))))')
    .eq('id', params.id)
    .single()

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other portal page in this app.
  const assignment = assignmentRaw as unknown as {
    id: string; title: string; description: string | null; due_at: string | null; max_score: number; class_id: string
    classes: {
      title: string | null; subjects: { name: string } | null
      class_enrollments: Array<{ students: { id: string; student_number: string; users: { full_name: string | null } | null } | null }>
    } | null
  } | null

  const { data: submissionsRaw } = await supabase
    .from('assignment_submissions')
    .select('id, student_id, content, file_path, submitted_at, score, feedback, graded_at, students(student_number, users(full_name))')
    .eq('assignment_id', params.id)
    .order('submitted_at', { ascending: true })

  const submissions = (submissionsRaw ?? []) as unknown as Array<{
    id: string; student_id: string; content: string | null; file_path: string | null; submitted_at: string
    score: number | null; feedback: string | null; graded_at: string | null
    students: { student_number: string; users: { full_name: string | null } | null } | null
  }>

  const fileUrls = new Map<string, string>()
  await Promise.all(submissions.filter(s => s.file_path).map(async s => {
    const { data } = await supabase.storage.from('assignment-submissions').createSignedUrl(s.file_path!, 3600)
    if (data?.signedUrl) fileUrls.set(s.id, data.signedUrl)
  }))

  const enrolled = assignment?.classes?.class_enrollments ?? []
  const submittedStudentIds = new Set(submissions.map(s => s.student_id))
  const notSubmitted = enrolled.filter(e => e.students && !submittedStudentIds.has(e.students.id))

  if (!assignment) {
    return <p className="text-gray-400 text-sm">Assignment not found.</p>
  }

  return (
    <div>
      <a href="/teacher/assignments" className="text-sm text-brand-blue hover:underline">← Back to Assignments</a>
      <h1 className="text-3xl font-display font-bold text-brand-blue mt-2 mb-1">{assignment.title}</h1>
      <p className="text-sm text-gray-500 mb-8">
        {assignment.classes?.title || assignment.classes?.subjects?.name || 'Class'}
        {assignment.due_at ? ` · Due ${new Date(assignment.due_at).toLocaleString()}` : ''} · Max score {assignment.max_score}
      </p>
      {assignment.description && <p className="card mb-6 text-sm text-gray-600">{assignment.description}</p>}

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Submissions ({submissions.length})</h2>
        {submissions.length === 0 ? (
          <p className="text-gray-400 text-sm">No submissions yet.</p>
        ) : (
          <div className="space-y-4">
            {submissions.map(s => (
              <div key={s.id} className="border-b border-gray-50 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{s.students?.users?.full_name ?? s.students?.student_number ?? '—'}</p>
                    <p className="text-xs text-gray-400">Submitted {new Date(s.submitted_at).toLocaleString()}</p>
                  </div>
                  {s.graded_at && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                      GRADED {s.score}/{assignment.max_score}
                    </span>
                  )}
                </div>
                {s.content && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{s.content}</p>}
                {fileUrls.has(s.id) && (
                  <a href={fileUrls.get(s.id)} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue underline mt-1 inline-block">
                    View attached file
                  </a>
                )}
                <GradeForm submissionId={s.id} maxScore={assignment.max_score} initialScore={s.score} initialFeedback={s.feedback} teacherId={teacherId} />
              </div>
            ))}
          </div>
        )}
      </div>

      {notSubmitted.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Not Yet Submitted ({notSubmitted.length})</h2>
          <ul className="text-sm text-gray-500 space-y-1">
            {notSubmitted.map((e, i) => (
              <li key={i}>{e.students?.users?.full_name ?? e.students?.student_number ?? '—'}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
