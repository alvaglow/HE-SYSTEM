import { createClient } from '@/lib/supabase/server'

export default async function ParentLocationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: linksRaw } = await supabase
    .from('parent_student_links')
    .select('students(id, users(full_name))')
    .eq('parent_user_id', user!.id)

  const links = (linksRaw ?? []) as unknown as Array<{ students: { id: string; users: { full_name: string | null } | null } | null }>
  const children = links.map(l => l.students).filter((s): s is { id: string; users: { full_name: string | null } | null } => !!s)

  const childCheckins = await Promise.all(
    children.map(async child => {
      const { data: recordsRaw } = await supabase
        .from('attendance_records')
        .select('id, marked_at, latitude, longitude, distance_meters, classes(title, location_name, location_address, subjects(name))')
        .eq('student_id', child.id)
        .eq('check_in_method', 'gps_biometric')
        .order('marked_at', { ascending: false })
        .limit(20)
      const records = (recordsRaw ?? []) as unknown as Array<{
        id: string; marked_at: string | null; latitude: number | null; longitude: number | null; distance_meters: number | null
        classes: { title: string | null; location_name: string | null; location_address: string | null; subjects: { name: string } | null } | null
      }>
      return { child, records }
    })
  )

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-2">Location Check-ins</h1>
      <p className="text-gray-500 text-sm mb-8">
        Check-in location is only recorded for classes using GPS/biometric attendance, and only at the moment of check-in
        via the mobile app — this is a history, not a live tracker.
      </p>
      {childCheckins.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No children linked to your account yet. Contact admin.</div>
      ) : (
        childCheckins.map(({ child, records }) => (
          <div key={child.id} className="card mb-6">
            <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">{child.users?.full_name ?? 'Child'}</h2>
            {records.length === 0 ? (
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
                    {records.map(r => (
                      <tr key={r.id} className="border-b border-gray-50">
                        <td className="py-2 text-gray-700">{r.classes?.title || r.classes?.subjects?.name || '—'}</td>
                        <td className="py-2 text-gray-500">{r.classes?.location_name || r.classes?.location_address || '—'}</td>
                        <td className="py-2 text-gray-500">{r.distance_meters != null ? `${r.distance_meters}m from zone center` : '—'}</td>
                        <td className="py-2 text-gray-500">{r.marked_at ? new Date(r.marked_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
