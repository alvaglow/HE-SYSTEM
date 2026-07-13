'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Room = { id: string; room_number: string; building: string | null; capacity: number | null; room_type: string }
type OccupiedClass = { room_number: string | null; starts_at: string; ends_at: string }

function defaultDate() {
  return new Date().toISOString().slice(0, 10)
}
function defaultTime(offsetHours: number) {
  const d = new Date()
  d.setHours(d.getHours() + offsetHours, 0, 0, 0)
  return d.toTimeString().slice(0, 5)
}

export default function FacilityFinder({ institutionId, rooms }: { institutionId: string; rooms: Room[] }) {
  const [date, setDate] = useState(defaultDate())
  const [startTime, setStartTime] = useState(defaultTime(0))
  const [endTime, setEndTime] = useState(defaultTime(1))
  const [roomType, setRoomType] = useState('all')
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)
  const [freeRoomIds, setFreeRoomIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setChecked(false)
    const windowStart = new Date(`${date}T${startTime}:00`)
    const windowEnd = new Date(`${date}T${endTime}:00`)

    const { data: classesRaw } = await supabase
      .from('classes')
      .select('room_number, starts_at, ends_at')
      .eq('institution_id', institutionId)
      .eq('is_cancelled', false)
      .gte('starts_at', `${date}T00:00:00`)
      .lt('starts_at', `${date}T23:59:59`)

    const classes = (classesRaw ?? []) as unknown as OccupiedClass[]
    const occupiedRoomNumbers = new Set(
      classes
        .filter(c => c.room_number && new Date(c.starts_at) < windowEnd && new Date(c.ends_at) > windowStart)
        .map(c => c.room_number!)
    )

    setFreeRoomIds(new Set(rooms.filter(r => !occupiedRoomNumbers.has(r.room_number)).map(r => r.id)))
    setChecked(true)
    setLoading(false)
  }

  const filteredRooms = rooms.filter(r => roomType === 'all' || r.room_type === roomType)

  return (
    <div className="space-y-6">
      <div className="card">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">From</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">To</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Room type</label>
            <select value={roomType} onChange={e => setRoomType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full">
              <option value="all">All</option>
              <option value="classroom">Classroom</option>
              <option value="lab">Lab</option>
              <option value="auditorium">Auditorium</option>
              <option value="study_room">Study Room</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn-primary sm:col-span-4">{loading ? 'Checking…' : 'Find Available Rooms'}</button>
        </form>
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">
          {checked ? `Available Rooms (${filteredRooms.filter(r => freeRoomIds.has(r.id)).length} of ${filteredRooms.length})` : 'All Rooms'}
        </h2>
        {filteredRooms.length === 0 ? (
          <p className="text-gray-400 text-sm">No rooms configured for this institution yet.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredRooms.map(r => {
              const isFree = !checked || freeRoomIds.has(r.id)
              return (
                <li key={r.id} className={`border rounded-xl p-3 ${isFree ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">{r.room_number}</p>
                      <p className="text-xs text-gray-500">{r.building ?? '—'} · {r.room_type}{r.capacity ? ` · cap. ${r.capacity}` : ''}</p>
                    </div>
                    {checked && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isFree ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                        {isFree ? 'Free' : 'Occupied'}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
