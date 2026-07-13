import { createClient } from '@/lib/supabase/server'
import RegistrationList from './RegistrationList'

export default async function StudentRegistrationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const institutionId = (meRaw as unknown as { institution_id: string } | null)?.institution_id ?? ''
  const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', user!.id).single()
  const studentId = (studentRaw as unknown as { id: string } | null)?.id ?? ''

  const [{ data: classesRaw }, { data: enrollmentsRaw }] = await Promise.all([
    supabase.from('classes')
      .select('id, title, starts_at, capacity, subjects(name), teachers(users(full_name))')
      .eq('institution_id', institutionId)
      .eq('is_cancelled', false)
      .order('starts_at', { ascending: true })
      .limit(100),
    supabase.from('class_enrollments').select('id, class_id, is_active').eq('student_id', studentId),
  ])

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other portal page in this app.
  const classes = (classesRaw ?? []) as unknown as Array<{
    id: string; title: string | null; starts_at: string; capacity: number | null
    subjects: { name: string } | null; teachers: { users: { full_name: string | null } | null } | null
  }>
  const enrollments = (enrollmentsRaw ?? []) as unknown as Array<{ id: string; class_id: string; is_active: boolean }>

  const activeCount = enrollments.filter(e => e.is_active).length

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-2">Course Registration</h1>
      <p className="text-sm text-gray-500 mb-6">Currently enrolled in {activeCount} class{activeCount === 1 ? '' : 'es'}.</p>
      <div className="card">
        <RegistrationList studentId={studentId} classes={classes} enrollments={enrollments} />
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Dropping a class keeps your enrolment history on record but marks it inactive. Classes with a capacity limit will reject enrolment once full.
      </p>
    </div>
  )
}
