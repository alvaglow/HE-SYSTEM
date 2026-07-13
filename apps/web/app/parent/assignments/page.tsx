import { createClient } from '@/lib/supabase/server'

export default async function ParentAssignmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: linksRaw } = await supabase
    .from('parent_student_links')
    .select('students(id, users(full_name))')
    .eq('parent_user_id', user!.id)
  const links = (linksRaw ?? []) as unknown as Array<{ students: { id: string; users: { full_name: string | null } | null } | null }>
  const children = links.map(l => l.students).filter((s): s is { id: string; users: { full_name: string | null } | null } => !!s)

  // assignments RLS ("assignments: parent view children") already scopes
  // this to classes the parent's own linked children are enrolled in.
  const { data: assignmentsRaw } = await supabase
    .from('assignments')
    .select('id, title, due_at, max_score, classes(title, subjects(name))')
    .order('due_at', { ascending: true, nullsFirst: false })
  const assignments = (assignmentsRaw ?? []) as unknown as Array<{
    id: string; title: string; due_at: string | null; max_score: number
    classes: { title: string | null; subjects: { name: string } | null } | null
  }>

  const childSubs = await Promise.all(
    children.map(async child => {
      const { data: subsRaw } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, score, graded_at')
        .eq('student_id', child.id)
      const subs = (subsRaw ?? []) as unknown as Array<{ assignment_id: string; score: number | null; graded_at: string | null }>
      return { child, subsByAssignment: new Map(subs.map(s => [s.assignment_id, s])) }
    })
  )

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Assignments</h1>
      {childSubs.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No children linked to your account yet. Contact admin.</div>
      ) : (
        childSubs.map(({ child, subsByAssignment }) => (
          <div key={child.id} className="card mb-6">
            <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">{child.users?.full_name ?? 'Child'}</h2>
            {assignments.length === 0 ? (
              <p className="text-gray-400 text-sm">No assignments yet.</p>
            ) : (
              <ul className="space-y-3">
                {assignments.map(a => {
                  const sub = subsByAssignment.get(a.id)
                  return (
                    <li key={a.id} className="flex justify-between items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-gray-800">{a.title}</p>
                        <p className="text-xs text-gray-500">
                          {a.classes?.title || a.classes?.subjects?.name || 'Class'}
                          {a.due_at ? ` · Due ${new Date(a.due_at).toLocaleString()}` : ''}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                        sub?.graded_at ? 'bg-green-50 text-green-700' : sub ? 'bg-blue-50 text-brand-blue' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {sub?.graded_at ? `${sub.score}/${a.max_score}` : sub ? 'SUBMITTED' : 'NOT SUBMITTED'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ))
      )}
    </div>
  )
}
