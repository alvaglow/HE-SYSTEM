/**
 * Mirrors apps/web/app/admin/rooms (RoomsManager).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Room = { id: string; room_number: string; building: string | null; capacity: number | null; room_type: string; is_active: boolean }
const ROOM_TYPES = ['classroom', 'lab', 'auditorium', 'study_room']

export default function RoomsManagerScreen() {
  const [institutionId, setInstitutionId] = useState('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [roomNumber, setRoomNumber] = useState('')
  const [building, setBuilding] = useState('')
  const [capacity, setCapacity] = useState('')
  const [roomType, setRoomType] = useState('classroom')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)
    const { data } = await supabase
      .from('campus_rooms')
      .select('id, room_number, building, capacity, room_type, is_active')
      .eq('institution_id', me.institutionId)
      .order('room_number', { ascending: true })
    setRooms((data ?? []) as unknown as Room[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleCreate() {
    setSubmitting(true)
    setError('')
    const { error } = await supabase.from('campus_rooms').insert({
      institution_id: institutionId, room_number: roomNumber, building: building || null,
      capacity: capacity ? Number(capacity) : null, room_type: roomType, is_active: true,
    } as unknown as never)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    setRoomNumber(''); setBuilding(''); setCapacity(''); setRoomType('classroom'); setOpen(false)
    await load()
  }

  async function toggleActive(r: Room) {
    await supabase.from('campus_rooms').update({ is_active: !r.is_active } as unknown as never).eq('id', r.id)
    await load()
  }

  async function remove(id: string) {
    await supabase.from('campus_rooms').delete().eq('id', id)
    await load()
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Campus Rooms" />
      {!open ? (
        <PrimaryButton label="+ Add Room" onPress={() => setOpen(true)} />
      ) : (
        <Card>
          <Text style={styles.cardTitle}>New Room</Text>
          <TextField value={roomNumber} onChangeText={setRoomNumber} placeholder="Room number (e.g. B2-05)" />
          <TextField value={building} onChangeText={setBuilding} placeholder="Building (optional)" />
          <TextField value={capacity} onChangeText={setCapacity} placeholder="Capacity (optional)" keyboardType="numeric" />
          <Text style={styles.label}>Room type</Text>
          <View style={styles.chipRow}>
            {ROOM_TYPES.map(t => (
              <Text key={t} onPress={() => setRoomType(t)} style={[chipStyles.chip, roomType === t ? chipStyles.chipActive : null]}>{t}</Text>
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Add Room" onPress={handleCreate} loading={submitting} disabled={!roomNumber} />
          <Text onPress={() => setOpen(false)} style={styles.cancelLink}>Cancel</Text>
        </Card>
      )}

      <Text style={styles.sectionLabel}>All Rooms ({rooms.length})</Text>
      {rooms.length === 0 ? (
        <EmptyState text="No rooms added yet." />
      ) : (
        rooms.map(r => (
          <Card key={r.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Badge label={r.room_type} />
                  <Text style={styles.roomTitle}>{r.room_number}</Text>
                </View>
                {r.building && <Text style={styles.roomSub}>{r.building}</Text>}
                {r.capacity && <Text style={styles.roomSub}>Capacity: {r.capacity}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text onPress={() => toggleActive(r)} style={styles.actionLink}>{r.is_active ? 'Deactivate' : 'Activate'}</Text>
                <Text onPress={() => remove(r.id)} style={[styles.actionLink, { color: colors.red }]}>Delete</Text>
              </View>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const chipStyles = StyleSheet.create({
  chip: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.grayLight, color: colors.gray, marginRight: 6, marginBottom: 6, overflow: 'hidden' },
  chipActive: { backgroundColor: colors.blue, color: colors.white },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
  label: { fontSize: 12, color: colors.gray, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  error: { color: colors.red, fontSize: 12, marginBottom: 8 },
  cancelLink: { textAlign: 'center', color: colors.gray, fontSize: 13, marginTop: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  roomTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  roomSub: { fontSize: 12, color: colors.gray, marginTop: 2 },
  actionLink: { fontSize: 12, color: colors.blue, fontWeight: '600' },
})
