/**
 * Mirrors apps/web/app/teacher/facilities (FacilityFinder), adapted to
 * mobile text inputs since RN has no native <input type="date"/"time">.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Room = { id: string; room_number: string; building: string | null; capacity: number | null; room_type: string }

function defaultDate() { return new Date().toISOString().slice(0, 10) }
function defaultTime(offsetHours: number) {
  const d = new Date(); d.setHours(d.getHours() + offsetHours, 0, 0, 0)
  return d.toTimeString().slice(0, 5)
}

export default function TeacherFacilitiesScreen() {
  const [institutionId, setInstitutionId] = useState('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(defaultDate())
  const [startTime, setStartTime] = useState(defaultTime(0))
  const [endTime, setEndTime] = useState(defaultTime(1))
  const [checking, setChecking] = useState(false)
  const [checked, setChecked] = useState(false)
  const [freeRoomIds, setFreeRoomIds] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)
    const { data } = await supabase.from('campus_rooms').select('id, room_number, building, capacity, room_type')
      .eq('institution_id', me.institutionId).eq('is_active', true).order('room_number', { ascending: true })
    setRooms((data ?? []) as unknown as Room[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleSearch() {
    setChecking(true)
    setChecked(false)
    const windowStart = new Date(`${date}T${startTime}:00`)
    const windowEnd = new Date(`${date}T${endTime}:00`)
    const { data } = await supabase.from('classes').select('room_number, starts_at, ends_at')
      .eq('institution_id', institutionId).eq('is_cancelled', false)
      .gte('starts_at', `${date}T00:00:00`).lt('starts_at', `${date}T23:59:59`)
    const classes = (data ?? []) as unknown as Array<{ room_number: string | null; starts_at: string; ends_at: string }>
    const occupied = new Set(
      classes.filter(c => c.room_number && new Date(c.starts_at) < windowEnd && new Date(c.ends_at) > windowStart).map(c => c.room_number!)
    )
    setFreeRoomIds(new Set(rooms.filter(r => !occupied.has(r.room_number)).map(r => r.id)))
    setChecked(true)
    setChecking(false)
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Facility Finder" />

      <Card>
        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextField value={date} onChangeText={setDate} placeholder="2026-07-14" />
        <Text style={styles.label}>From (HH:MM)</Text>
        <TextField value={startTime} onChangeText={setStartTime} placeholder="14:00" />
        <Text style={styles.label}>To (HH:MM)</Text>
        <TextField value={endTime} onChangeText={setEndTime} placeholder="15:00" />
        <PrimaryButton label="Find Available Rooms" onPress={handleSearch} loading={checking} />
      </Card>

      <Text style={styles.sectionLabel}>
        {checked ? `Available (${rooms.filter(r => freeRoomIds.has(r.id)).length} of ${rooms.length})` : 'All Rooms'}
      </Text>
      {rooms.length === 0 ? (
        <EmptyState text="No rooms configured for this institution yet." />
      ) : (
        <Card>
          {rooms.map(r => {
            const isFree = !checked || freeRoomIds.has(r.id)
            return (
              <View key={r.id} style={[styles.roomRow, isFree ? styles.roomFree : styles.roomOccupied]}>
                <View>
                  <Text style={styles.roomName}>{r.room_number}</Text>
                  <Text style={styles.roomMeta}>{r.building ?? '—'} · {r.room_type}{r.capacity ? ` · cap. ${r.capacity}` : ''}</Text>
                </View>
                {checked && <Text style={isFree ? styles.freeBadge : styles.occupiedBadge}>{isFree ? 'Free' : 'Occupied'}</Text>}
              </View>
            )
          })}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  label: { fontSize: 12, color: colors.gray, marginBottom: 4, marginTop: 6 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  roomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8, marginBottom: 6 },
  roomFree: { backgroundColor: colors.greenLight },
  roomOccupied: { backgroundColor: colors.grayLight, opacity: 0.7 },
  roomName: { fontSize: 13, fontWeight: '700', color: colors.text },
  roomMeta: { fontSize: 11, color: colors.gray, marginTop: 2 },
  freeBadge: { fontSize: 11, fontWeight: '700', color: colors.green },
  occupiedBadge: { fontSize: 11, fontWeight: '700', color: colors.gray },
})
