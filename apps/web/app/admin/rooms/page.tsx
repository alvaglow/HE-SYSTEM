import { createClient } from '@/lib/supabase/server'
import RoomsManager from './RoomsManager'

export default async function AdminRoomsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: roomsRaw } = await supabase
    .from('campus_rooms')
    .select('id, room_number, building, capacity, room_type, is_active')
    .eq('institution_id', institutionId)
    .order('room_number', { ascending: true })

  const rooms = (roomsRaw ?? []) as unknown as Array<{
    id: string; room_number: string; building: string | null; capacity: number | null; room_type: string; is_active: boolean
  }>

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-6">Campus Rooms</h1>
      <RoomsManager institutionId={institutionId} rooms={rooms} />
    </div>
  )
}
