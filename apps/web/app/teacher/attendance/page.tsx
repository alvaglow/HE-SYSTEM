import { createClient } from '@/lib/supabase/server'
import GenerateOtpForm from './GenerateOtpForm'

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-green-50 text-green-700',
  absent: 'bg-red-50 text-brand-red',
  late: 'bg-yellow-50 text-yellow-700',
  excused: 'bg-blue-50 text-brand-blue',
}

export default async function TeacherAttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: teacherRaw } = await supabase.from('teachers').select('id').eq('user_id', user!.id).single()
  const teacher = teacherRaw as unknown as { id: string } | null

  const { data: classesRaw } = await supabase
    .from('classes')
    .select('id, title, subjects(name)')
    .eq('teacher_id', teacher?.id ?? '')
    .order('starts_at', { ascending: false })
    .limit(20)

  const classes = (classesRaw ?? []) as unknown as Array<{ id: string; title: string | null; subjects: { name: string } | null }>
  const classIds = classes.map(c => c.id)

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const { data: checkinsRaw } = classIds.length > 0
    ? await supabase
        .from('attendance_records')
        .select('id, status, check_in_method, marked_at, class_id, students(student_number, users(full_name))')
        .in('class_id', classIds)
        .gte('marked_at', todayStart.toISOString())
        .order('marked_at', { ascending: false })
    : { data: [] }

  const checkins = (checkinsRaw ?? []) as unknown as Array<{
    id: string; status: string | null; check_in_method: string | null; marked_at: string | null; class_id: string
    students: { student_number: string; users: { full_name: string | null } | null } | null
  }>

  const classLabel = new Map(classes.map(c => [c.id, c.title || c.subjects?.name || 'Class']))

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Attendance</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Generate Check-In OTP</h2>
        <GenerateOtpForm classes={classes.map(c => ({ id: c.id, label: c.title || c.subjects?.name || 'Class' }))} />
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Today's Check-Ins ({checkins.length})</h2>
        {checkins.length === 0 ? (
          <p className="text-gray-400 text-sm">No check-ins recorded today yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Class</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {checkins.map(c => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{c.students?.users?.full_name ?? c.students?.student_number ?? '—'}</td>
                    <td className="py-2 text-gray-500">{classLabel.get(c.class_id) ?? '—'}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status ?? 'absent']}`}>
                        {(c.status ?? 'absent').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500 capitalize">{c.check_in_method ?? '—'}</td>
                    <td className="py-2 text-gray-500">{c.marked_at ? new Date(c.marked_at).toLocaleTimeString() : '—'}</td>
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
