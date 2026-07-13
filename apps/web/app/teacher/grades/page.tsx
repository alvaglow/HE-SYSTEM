import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import AddResultForm from './AddResultForm'

const GRADE_STYLES: Record<string, string> = {
  A: 'bg-green-50 text-green-700', B: 'bg-blue-50 text-brand-blue', C: 'bg-yellow-50 text-yellow-700',
  D: 'bg-orange-50 text-orange-700', F: 'bg-red-50 text-brand-red',
}

export default async function TeacherGradesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: teacherRaw } = await supabase.from('teachers').select('id, institution_id').eq('user_id', user!.id).single()
  const teacher = teacherRaw as unknown as { id: string; institution_id: string } | null
  const teacherId = teacher?.id ?? ''
  const institutionId = teacher?.institution_id ?? ''

  const [{ data: resultsRaw }, { data: classesRaw }] = await Promise.all([
    supabase.from('exam_results')
      .select('id, score, max_score, grade, assessment_name, assessment_type, exam_date, is_published, attachment_url, students(student_number, users(full_name)), subjects(name)')
      .eq('teacher_id', teacherId)
      .order('exam_date', { ascending: false })
      .limit(50),
    supabase.from('classes')
      .select('id, title, subject_id, subjects(id, name), class_enrollments(students(id, student_number, users(full_name)))')
      .eq('teacher_id', teacherId),
  ])

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other portal page in this app.
  const results = (resultsRaw ?? []) as unknown as Array<{
    id: string; score: number; max_score: number; grade: string | null
    assessment_name: string; assessment_type: string | null; exam_date: string | null; is_published: boolean
    attachment_url: string | null
    students: { student_number: string; users: { full_name: string | null } | null } | null
    subjects: { name: string } | null
  }>

  const attachmentUrls = new Map<string, string>()
  await Promise.all(results.filter(r => r.attachment_url).map(async r => {
    const { data } = await supabase.storage.from('exam-attachments').createSignedUrl(r.attachment_url!, 3600)
    if (data?.signedUrl) attachmentUrls.set(r.id, data.signedUrl)
  }))

  const classes = (classesRaw ?? []) as unknown as Array<{
    id: string; title: string | null; subject_id: string; subjects: { id: string; name: string } | null
    class_enrollments: Array<{ students: { id: string; student_number: string; users: { full_name: string | null } | null } | null }>
  }>

  const studentOptions = new Map<string, string>()
  const subjectOptions = new Map<string, string>()
  for (const c of classes) {
    if (c.subjects) subjectOptions.set(c.subjects.id, c.subjects.name)
    for (const e of c.class_enrollments ?? []) {
      const s = e.students
      if (s) studentOptions.set(s.id, `${s.users?.full_name ?? 'Student'} (${s.student_number})`)
    }
  }

  async function togglePublish(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const current = formData.get('current') === 'true'
    const supabase = await createClient()
    // AUDIT FIX (build): this project's generated Database types collapse
    // update() payload types to `never` — cast once here, same pattern used
    // across every other portal form in this app.
    await supabase.from('exam_results').update({ is_published: !current } as unknown as never).eq('id', id)
    revalidatePath('/teacher/grades')
  }

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Grades</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Add Result</h2>
        <AddResultForm
          teacherId={teacherId}
          institutionId={institutionId}
          students={[...studentOptions.entries()].map(([id, label]) => ({ id, label }))}
          subjects={[...subjectOptions.entries()].map(([id, label]) => ({ id, label }))}
        />
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Results ({results.length})</h2>
        {results.length === 0 ? (
          <p className="text-gray-400 text-sm">No results recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Assessment</th>
                  <th className="pb-2 font-medium">Score</th>
                  <th className="pb-2 font-medium">Grade</th>
                  <th className="pb-2 font-medium">Published</th>
                  <th className="pb-2 font-medium">Attachment</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{r.students?.users?.full_name ?? r.students?.student_number ?? '—'}</td>
                    <td className="py-2 text-gray-500">{r.subjects?.name ?? '—'}</td>
                    <td className="py-2 text-gray-500">{r.assessment_name}{r.assessment_type ? ` (${r.assessment_type})` : ''}</td>
                    <td className="py-2 text-gray-700">{r.score} / {r.max_score}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${GRADE_STYLES[r.grade ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                        {r.grade ?? '—'}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_published ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.is_published ? 'PUBLISHED' : 'DRAFT'}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">
                      {attachmentUrls.has(r.id) ? <a href={attachmentUrls.get(r.id)} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline">View</a> : '—'}
                    </td>
                    <td className="py-2">
                      <form action={togglePublish}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="current" value={String(r.is_published)} />
                        <button type="submit" className="text-xs text-brand-blue hover:underline">
                          {r.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                      </form>
                    </td>
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
