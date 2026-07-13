import { createClient } from '@/lib/supabase/server'

export default async function AdminBookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: bookingsRaw } = await supabase
    .from('room_bookings')
    .select('id, purpose, booking_date, start_time, end_time, status, campus_rooms(room_number, building), users!room_bookings_booked_by_fkey(full_name, role)')
    .eq('institution_id', institutionId)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(300)

  const bookings = (bookingsRaw ?? []) as unknown as Array<{
    id: string; purpose: string; booking_date: string; start_time: string; end_time: string; status: string
    campus_rooms: { room_number: string; building: string | null } | null
    users: { full_name: string | null; role: string } | null
  }>

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Room Bookings</h1>
      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">All Bookings ({bookings.length})</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-400 text-sm">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Room</th>
                  <th className="pb-2 font-medium">Booked By</th>
                  <th className="pb-2 font-medium">Purpose</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{b.campus_rooms?.room_number} <span className="text-gray-400">({b.campus_rooms?.building ?? '—'})</span></td>
                    <td className="py-2 text-gray-500">{b.users?.full_name ?? '—'} <span className="text-gray-400 capitalize">({b.users?.role})</span></td>
                    <td className="py-2 text-gray-500">{b.purpose}</td>
                    <td className="py-2 text-gray-500">{new Date(b.booking_date).toLocaleDateString()}</td>
                    <td className="py-2 text-gray-500">{b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {b.status}
                      </span>
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
