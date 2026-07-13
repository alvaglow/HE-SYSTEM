/**
 * Mirrors apps/web/app/student/facilities (FacilityFinder).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Room = { id: string; room_number: string; building: string | null; capacity: number | null; room_type: string }
type OccupiedClass = { room_number: string | null; starts_at: string; ends_at: string }

function defaultDate() { return new Date().toISOString().slice(0, 10) }
function defaultTime(offsetHours: number) {
  const d = new Date()
  d.setHours(d.getHours() + offsetHours, 0, 0, 0)
  return d.toTimeString().slice(0, 5)
}

export default function FacilitiesScreen() {
  const [institutionId, setInstitutionId] = useState('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(defaultDate())
  const [startTime, setStartTime] = useState(defaultTime(0))
  const [endTime, setEndTime] = useState(defaultTime(1))
  const [checked, setChecked] = useState(false)
  const [freeIds, setFreeIds] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)
    const { data } = await supabase
      .from('campus_rooms')
      .select('id, room_number, building, capacity, room_type')
      .eq('institution_id', me.institutionId)
      .eq('is_active', true)
      .order('room_number', { ascending: true })
    setRooms((data ?? []) as unknown as Room[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleSearch() {
    setSearching(true)
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
    const occupied = new Set(
      classes.filter(c => c.room_number && new Date(c.starts_at) < windowEnd && new Date(c.ends_at) > windowStart).map(c => c.room_number!)
    )
    setFreeIds(new Set(rooms.filter(r => !occupied.has(r.room_number)).map(r => r.id)))
    setChecked(true)
    setSearching(false)
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Facility Finder" />
      <Card>
        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextField value={date} onChangeText={setDate} placeholder="2026-07-13" />
        <Text style={styles.label}>From (HH:mm)</Text>
        <TextField value={startTime} onChangeText={setStartTime} placeholder="09:00" />
        <Text style={styles.label}>To (HH:mm)</Text>
        <TextField value={endTime} onChangeText={setEndTime} placeholder="10:00" />
        <PrimaryButton label="Find Available Rooms" onPress={handleSearch} loading={searching} />
      </Card>

      <Text style={styles.sectionLabel}>
        {checked ? `Available (${rooms.filter(r => freeIds.has(r.id)).length} of ${rooms.length})` : 'All Rooms'}
      </Text>
      {rooms.length === 0 ? (
        <EmptyState text="No rooms configured yet." />
      ) : (
        rooms.map(r => {
          const isFree = !checked || freeIds.has(r.id)
          return (
            <Card key={r.id} style={!isFree ? { opacity: 0.5 } : undefined}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.roomTitle}>{r.room_number}</Text>
                  <Text style={styles.roomSub}>{r.building ?? '—'} · {r.room_type}{r.capacity ? ` · cap. ${r.capacity}` : ''}</Text>
                </View>
                {checked && <Badge label={isFree ? 'Free' : 'Occupied'} status={isFree ? 'approved' : 'rejected'} />}
              </View>
            </Card>
          )
        })
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  label: { fontSize: 12, color: colors.gray, marginBottom: 6 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  roomTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  roomSub: { fontSize: 12, color: colors.gray, marginTop: 2 },
})
