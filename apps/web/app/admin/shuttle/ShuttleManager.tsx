'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Route = { id: string; route_name: string; stops: string[]; departure_times: string[]; notes: string | null; is_active: boolean }

export default function ShuttleManager({ institutionId, routes }: { institutionId: string; routes: Route[] }) {
  const [open, setOpen] = useState(false)
  const [routeName, setRouteName] = useState('')
  const [stops, setStops] = useState('')
  const [departureTimes, setDepartureTimes] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.from('shuttle_routes').insert({
      institution_id: institutionId, route_name: routeName,
      stops: stops.split(',').map(s => s.trim()).filter(Boolean),
      departure_times: departureTimes.split(',').map(t => t.trim()).filter(Boolean),
      notes: notes || null, is_active: true,
    } as unknown as never)
    setLoading(false)
    if (error) { setError(error.message); return }
    setRouteName(''); setStops(''); setDepartureTimes(''); setNotes(''); setOpen(false)
    router.refresh()
  }

  async function toggleActive(r: Route) {
    await supabase.from('shuttle_routes').update({ is_active: !r.is_active } as unknown as never).eq('id', r.id)
    router.refresh()
  }

  async function remove(id: string) {
    await supabase.from('shuttle_routes').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-primary mb-6">+ Add Route</button>
      ) : (
        <div className="card mb-6">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">New Shuttle Route</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3">
            <input required value={routeName} onChange={e => setRouteName(e.target.value)} placeholder="Route name (e.g. Campus ↔ Metro Station)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input required value={stops} onChange={e => setStops(e.target.value)} placeholder="Stops, comma-separated (e.g. Main Gate, Library, Metro Station)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input required value={departureTimes} onChange={e => setDepartureTimes(e.target.value)} placeholder="Departure times, comma-separated (e.g. 07:30, 08:15, 09:00)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            {error && <p className="text-brand-red text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding…' : 'Add Route'}</button>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-brand-blue">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">All Routes ({routes.length})</h2>
        {routes.length === 0 ? (
          <p className="text-gray-400 text-sm">No shuttle routes added yet.</p>
        ) : (
          <ul className="space-y-4">
            {routes.map(r => (
              <li key={r.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">{r.route_name}</p>
                    <p className="text-sm text-gray-500 mt-1">{r.stops.join(' → ')}</p>
                    <p className="text-xs text-gray-400 mt-1">Departures: {r.departure_times.join(', ')}</p>
                    {r.notes && <p className="text-xs text-gray-400 mt-1">{r.notes}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <button onClick={() => toggleActive(r)} className="text-xs text-brand-blue hover:underline">
                      {r.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => remove(r.id)} className="text-xs text-brand-red hover:underline">Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
