'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Room = { id: string; room_number: string; building: string | null; capacity: number | null; room_type: string; is_active: boolean }

const ROOM_TYPES = ['classroom', 'lab', 'auditorium', 'study_room']

export default function RoomsManager({ institutionId, rooms }: { institutionId: string; rooms: Room[] }) {
  const [open, setOpen] = useState(false)
  const [roomNumber, setRoomNumber] = useState('')
  const [building, setBuilding] = useState('')
  const [capacity, setCapacity] = useState('')
  const [roomType, setRoomType] = useState('classroom')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.from('campus_rooms').insert({
      institution_id: institutionId, room_number: roomNumber, building: building || null,
      capacity: capacity ? Number(capacity) : null, room_type: roomType, is_active: true,
    } as unknown as never)
    setLoading(false)
    if (error) { setError(error.message); return }
    setRoomNumber(''); setBuilding(''); setCapacity(''); setRoomType('classroom'); setOpen(false)
    router.refresh()
  }

  async function toggleActive(r: Room) {
    await supabase.from('campus_rooms').update({ is_active: !r.is_active } as unknown as never).eq('id', r.id)
    router.refresh()
  }

  async function remove(id: string) {
    await supabase.from('campus_rooms').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-primary mb-6">+ Add Room</button>
      ) : (
        <div className="card mb-6">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">New Room</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input required value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="Room number (e.g. B2-05)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input value={building} onChange={e => setBuilding(e.target.value)} placeholder="Building (optional)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input type="number" min="1" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="Capacity (optional)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <select value={roomType} onChange={e => setRoomType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {error && <p className="text-brand-red text-sm sm:col-span-2">{error}</p>}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding…' : 'Add Room'}</button>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-brand-blue">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">All Rooms ({rooms.length})</h2>
        {rooms.length === 0 ? (
          <p className="text-gray-400 text-sm">No rooms added yet.</p>
        ) : (
          <ul className="space-y-3">
            {rooms.map(r => (
              <li key={r.id} className="flex justify-between items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-blue-100 text-brand-blue">{r.room_type}</span>
                    <span className="font-medium text-gray-800">{r.room_number}</span>
                    {r.building && <span className="text-sm text-gray-400">— {r.building}</span>}
                  </div>
                  {r.capacity && <p className="text-sm text-gray-500 mt-1">Capacity: {r.capacity}</p>}
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <button onClick={() => toggleActive(r)} className="text-xs text-brand-blue hover:underline">
                    {r.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => remove(r.id)} className="text-xs text-brand-red hover:underline">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
