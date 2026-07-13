import { createClient } from '@/lib/supabase/server'
import FacilityFinder from './FacilityFinder'

export default async function StudentFacilitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: roomsRaw } = await supabase
    .from('campus_rooms')
    .select('id, room_number, building, capacity, room_type')
    .eq('institution_id', institutionId)
    .eq('is_active', true)
    .order('room_number', { ascending: true })

  const rooms = (roomsRaw ?? []) as unknown as Array<{
    id: string; room_number: string; building: string | null; capacity: number | null; room_type: string
  }>

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-6">Facility Finder</h1>
      <FacilityFinder institutionId={institutionId} rooms={rooms} />
    </div>
  )
}
