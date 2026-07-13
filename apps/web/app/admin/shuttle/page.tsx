import { createClient } from '@/lib/supabase/server'
import ShuttleManager from './ShuttleManager'

export default async function AdminShuttlePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: routesRaw } = await supabase
    .from('shuttle_routes')
    .select('id, route_name, stops, departure_times, notes, is_active')
    .eq('institution_id', institutionId)
    .order('route_name', { ascending: true })

  const routes = (routesRaw ?? []) as unknown as Array<{
    id: string; route_name: string; stops: string[]; departure_times: string[]; notes: string | null; is_active: boolean
  }>

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-6">Campus Shuttle</h1>
      <ShuttleManager institutionId={institutionId} routes={routes} />
    </div>
  )
}
