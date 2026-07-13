import { createClient } from '@/lib/supabase/server'
import BookingForm from './BookingForm'
import CancelBookingButton from './CancelBookingButton'

export default async function RoomBookingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const todayIso = new Date().toISOString().slice(0, 10)

  const [{ data: roomsRaw }, { data: bookingsRaw }] = await Promise.all([
    supabase.from('campus_rooms').select('id, room_number, building, capacity, room_type').eq('institution_id', institutionId).eq('is_active', true).order('room_number'),
    supabase.from('room_bookings')
      .select('id, room_id, booked_by, purpose, booking_date, start_time, end_time, status, campus_rooms(room_number, building)')
      .eq('institution_id', institutionId)
      .eq('status', 'confirmed')
      .gte('booking_date', todayIso)
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(200),
  ])

  const rooms = (roomsRaw ?? []) as unknown as Array<{ id: string; room_number: string; building: string | null; capacity: number | null; room_type: string }>
  const bookings = (bookingsRaw ?? []) as unknown as Array<{
    id: string; room_id: string; booked_by: string; purpose: string; booking_date: string; start_time: string; end_time: string; status: string
    campus_rooms: { room_number: string; building: string | null } | null
  }>

  const myBookings = bookings.filter(b => b.booked_by === user!.id)

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Room Booking</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Book a Room</h2>
        {rooms.length === 0 ? (
          <p className="text-gray-400 text-sm">No rooms configured for this institution yet.</p>
        ) : (
          <BookingForm institutionId={institutionId} rooms={rooms} />
        )}
        <p className="text-xs text-gray-400 mt-3">Overlapping bookings for the same room and time are automatically blocked.</p>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">My Upcoming Bookings ({myBookings.length})</h2>
        {myBookings.length === 0 ? (
          <p className="text-gray-400 text-sm">No upcoming bookings.</p>
        ) : (
          <div className="space-y-2">
            {myBookings.map(b => (
              <div key={b.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">{b.campus_rooms?.room_number} — {b.purpose}</p>
                  <p className="text-xs text-gray-400">{new Date(b.booking_date).toLocaleDateString()} · {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}</p>
                </div>
                <CancelBookingButton bookingId={b.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">All Upcoming Bookings ({bookings.length})</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-400 text-sm">No upcoming bookings.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Room</th>
                  <th className="pb-2 font-medium">Purpose</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{b.campus_rooms?.room_number} <span className="text-gray-400">({b.campus_rooms?.building ?? '—'})</span></td>
                    <td className="py-2 text-gray-500">{b.purpose}</td>
                    <td className="py-2 text-gray-500">{new Date(b.booking_date).toLocaleDateString()}</td>
                    <td className="py-2 text-gray-500">{b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}</td>
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
