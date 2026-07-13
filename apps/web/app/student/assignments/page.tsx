import { createClient } from '@/lib/supabase/server'
import SubmitForm from './SubmitForm'

export default async function StudentAssignmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const institutionId = (meRaw as unknown as { institution_id: string } | null)?.institution_id ?? ''
  const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', user!.id).single()
  const studentId = (studentRaw as unknown as { id: string } | null)?.id ?? ''

  const { data: assignmentsRaw } = await supabase
    .from('assignments')
    .select('id, title, description, due_at, max_score, classes(title, subjects(name))')
    .order('due_at', { ascending: true, nullsFirst: false })

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other portal page in this app.
  const assignments = (assignmentsRaw ?? []) as unknown as Array<{
    id: string; title: string; description: string | null; due_at: string | null; max_score: number
    classes: { title: string | null; subjects: { name: string } | null } | null
  }>

  const { data: submissionsRaw } = await supabase
    .from('assignment_submissions')
    .select('id, assignment_id, content, score, feedback, graded_at, submitted_at')
    .eq('student_id', studentId)

  const submissions = (submissionsRaw ?? []) as unknown as Array<{
    id: string; assignment_id: string; content: string | null; score: number | null; feedback: string | null
    graded_at: string | null; submitted_at: string
  }>
  const byAssignment = new Map(submissions.map(s => [s.assignment_id, s]))

  const now = Date.now()

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Assignments</h1>

      {assignments.length === 0 ? (
        <p className="text-gray-400 text-sm">No assignments yet.</p>
      ) : (
        <div className="space-y-4">
          {assignments.map(a => {
            const sub = byAssignment.get(a.id)
            const overdue = a.due_at && new Date(a.due_at).getTime() < now && !sub
            return (
              <div key={a.id} className="card">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="font-display font-semibold text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-500">
                      {a.classes?.title || a.classes?.subjects?.name || 'Class'}
                      {a.due_at ? ` · Due ${new Date(a.due_at).toLocaleString()}` : ' · No due date'} · Max score {a.max_score}
                    </p>
                  </div>
                  {sub?.graded_at ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 whitespace-nowrap">
                      {sub.score}/{a.max_score}
                    </span>
                  ) : sub ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-brand-blue whitespace-nowrap">SUBMITTED</span>
                  ) : overdue ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-brand-red whitespace-nowrap">OVERDUE</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">NOT SUBMITTED</span>
                  )}
                </div>
                {a.description && <p className="text-sm text-gray-600 mt-2">{a.description}</p>}

                {sub?.graded_at ? (
                  <div className="mt-3 bg-green-50 rounded-lg p-3 text-sm">
                    <p className="text-green-800 font-medium">Score: {sub.score} / {a.max_score}</p>
                    {sub.feedback && <p className="text-green-700 mt-1">{sub.feedback}</p>}
                  </div>
                ) : (
                  <SubmitForm assignmentId={a.id} studentId={studentId} institutionId={institutionId} existingId={sub?.id ?? null} initialContent={sub?.content ?? null} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
