import { createClient } from '@/lib/supabase/server'
import OtpCheckinForm from './OtpCheckinForm'

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-green-50 text-green-700',
  absent: 'bg-red-50 text-brand-red',
  late: 'bg-yellow-50 text-yellow-700',
  excused: 'bg-blue-50 text-brand-blue',
}

export default async function StudentAttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', user!.id).single()
  const student = studentRaw as unknown as { id: string } | null
  const studentId = student?.id ?? ''

  const { data: recordsRaw } = await supabase
    .from('attendance_records')
    .select('id, status, check_in_method, marked_at, classes(title, subjects(name))')
    .eq('student_id', studentId)
    .order('marked_at', { ascending: false })
    .limit(50)

  const records = (recordsRaw ?? []) as unknown as Array<{
    id: string; status: string | null; check_in_method: string | null; marked_at: string | null
    classes: { title: string | null; subjects: { name: string } | null } | null
  }>

  const total = records.length
  const present = records.filter(r => r.status === 'present' || r.status === 'late').length
  const pct = total > 0 ? Math.round((present / total) * 100) : 0

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Attendance</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Attendance Rate</p>
          <p className="text-2xl font-display font-bold text-brand-blue">{pct}%</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Sessions Recorded</p>
          <p className="text-2xl font-display font-bold text-gray-700">{total}</p>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Check In with OTP</h2>
        <OtpCheckinForm studentId={studentId} />
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">History</h2>
        {records.length === 0 ? (
          <p className="text-gray-400 text-sm">No attendance records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Class</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{r.classes?.title || r.classes?.subjects?.name || 'Class'}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status ?? 'absent']}`}>
                        {(r.status ?? 'absent').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500 capitalize">{r.check_in_method ?? '—'}</td>
                    <td className="py-2 text-gray-500">{r.marked_at ? new Date(r.marked_at).toLocaleString() : '—'}</td>
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
