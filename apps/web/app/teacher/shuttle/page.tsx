import { createClient } from '@/lib/supabase/server'

export default async function TeacherShuttlePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const institutionId = (meRaw as unknown as { institution_id: string } | null)?.institution_id ?? ''

  const { data: routesRaw } = await supabase
    .from('shuttle_routes')
    .select('id, route_name, stops, departure_times, notes')
    .eq('institution_id', institutionId)
    .eq('is_active', true)
    .order('route_name', { ascending: true })

  const routes = (routesRaw ?? []) as unknown as Array<{
    id: string; route_name: string; stops: string[]; departure_times: string[]; notes: string | null
  }>

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-6">Campus Shuttle</h1>
      <div className="card">
        {routes.length === 0 ? (
          <p className="text-gray-400 text-sm">No shuttle routes published yet.</p>
        ) : (
          <ul className="space-y-4">
            {routes.map(r => (
              <li key={r.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                <p className="font-medium text-gray-800">{r.route_name}</p>
                <p className="text-sm text-gray-500 mt-1">{r.stops.join(' → ')}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {r.departure_times.map((t, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-brand-blue-100 text-brand-blue">{t}</span>
                  ))}
                </div>
                {r.notes && <p className="text-xs text-gray-400 mt-2">{r.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
