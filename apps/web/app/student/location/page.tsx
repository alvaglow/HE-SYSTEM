import { createClient } from '@/lib/supabase/server'

export default async function StudentLocationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', user!.id).single()
  const student = studentRaw as unknown as { id: string } | null
  const studentId = student?.id ?? ''

  const { data: checkinsRaw } = await supabase
    .from('attendance_records')
    .select('id, marked_at, latitude, longitude, distance_meters, classes(title, location_name, location_address, subjects(name))')
    .eq('student_id', studentId)
    .eq('check_in_method', 'gps_biometric')
    .order('marked_at', { ascending: false })
    .limit(50)

  const checkins = (checkinsRaw ?? []) as unknown as Array<{
    id: string; marked_at: string | null; latitude: number | null; longitude: number | null; distance_meters: number | null
    classes: { title: string | null; location_name: string | null; location_address: string | null; subjects: { name: string } | null } | null
  }>

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-2">Location Check-In History</h1>
      <p className="text-gray-500 text-sm mb-8">
        This is a read-only history of your GPS/biometric check-ins. Live GPS and biometric check-in requires the
        HE-SYSTEM mobile app, since it relies on an on-device secure liveness check that a web browser cannot perform.
        Use the OTP check-in on the Attendance page for web-based check-in.
      </p>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">History ({checkins.length})</h2>
        {checkins.length === 0 ? (
          <p className="text-gray-400 text-sm">No GPS/biometric check-ins recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Class</th>
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium">Distance</th>
                  <th className="pb-2 font-medium">Checked In</th>
                </tr>
              </thead>
              <tbody>
                {checkins.map(c => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{c.classes?.title || c.classes?.subjects?.name || 'Class'}</td>
                    <td className="py-2 text-gray-500">{c.classes?.location_name || c.classes?.location_address || '—'}</td>
                    <td className="py-2 text-gray-500">{c.distance_meters != null ? `${c.distance_meters}m from zone center` : '—'}</td>
                    <td className="py-2 text-gray-500">{c.marked_at ? new Date(c.marked_at).toLocaleString() : '—'}</td>
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
