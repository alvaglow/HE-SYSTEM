'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Room = { id: string; room_number: string; building: string | null; capacity: number | null; room_type: string }

function defaultDate() {
  return new Date().toISOString().slice(0, 10)
}
function defaultTime(offsetHours: number) {
  const d = new Date()
  d.setHours(d.getHours() + offsetHours, 0, 0, 0)
  return d.toTimeString().slice(0, 5)
}

export default function BookingForm({ institutionId, rooms }: { institutionId: string; rooms: Room[] }) {
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? '')
  const [date, setDate] = useState(defaultDate())
  const [startTime, setStartTime] = useState(defaultTime(1))
  const [endTime, setEndTime] = useState(defaultTime(2))
  const [purpose, setPurpose] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!roomId || !purpose.trim()) { setError('Room and purpose are required.'); return }
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error: insertErr } = await supabase.from('room_bookings').insert({
      institution_id: institutionId,
      room_id: roomId,
      booked_by: user!.id,
      purpose: purpose.trim(),
      booking_date: date,
      start_time: startTime,
      end_time: endTime,
    } as unknown as never)
    setLoading(false)
    if (insertErr) { setError(insertErr.message); return }
    setPurpose('')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Room</label>
        <select value={roomId} onChange={e => setRoomId(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full">
          {rooms.map(r => (
            <option key={r.id} value={r.id}>{r.room_number} — {r.building ?? '—'} ({r.room_type})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Purpose</label>
        <input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Club meeting" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">From</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">To</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
        </div>
      </div>
      {error && <p className="text-brand-red text-xs sm:col-span-2">{error}</p>}
      <button type="submit" disabled={loading || rooms.length === 0} className="btn-primary sm:col-span-2">
        {loading ? 'Booking…' : 'Book Room'}
      </button>
    </form>
  )
}
