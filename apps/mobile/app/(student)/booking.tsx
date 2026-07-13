/**
 * Mirrors apps/web/app/student/booking (BookingForm + my/all bookings).
 * Duplicated identically in (teacher)/booking.tsx per this codebase's
 * mobile convention (business logic is role-agnostic).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Room = { id: string; room_number: string; building: string | null; room_type: string }
type Booking = {
  id: string; room_id: string; booked_by: string; purpose: string; booking_date: string; start_time: string; end_time: string; status: string
  campus_rooms: { room_number: string; building: string | null } | null
}

function defaultDate() { return new Date().toISOString().slice(0, 10) }

export default function BookingScreen() {
  const [userId, setUserId] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [roomId, setRoomId] = useState('')
  const [date, setDate] = useState(defaultDate())
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [purpose, setPurpose] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setUserId(me.id)
    setInstitutionId(me.institutionId)

    const todayIso = new Date().toISOString().slice(0, 10)
    const [{ data: roomsRaw }, { data: bookingsRaw }] = await Promise.all([
      supabase.from('campus_rooms').select('id, room_number, building, room_type').eq('institution_id', me.institutionId).eq('is_active', true).order('room_number'),
      supabase.from('room_bookings')
        .select('id, room_id, booked_by, purpose, booking_date, start_time, end_time, status, campus_rooms(room_number, building)')
        .eq('institution_id', me.institutionId).eq('status', 'confirmed').gte('booking_date', todayIso)
        .order('booking_date', { ascending: true }).order('start_time', { ascending: true }).limit(100),
    ])
    const roomList = (roomsRaw ?? []) as unknown as Room[]
    setRooms(roomList)
    setRoomId(prev => prev || roomList[0]?.id || '')
    setBookings((bookingsRaw ?? []) as unknown as Booking[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function submit() {
    if (!roomId || !purpose.trim()) { setError('Room and purpose are required.'); return }
    setSubmitting(true)
    setError('')
    const { error: insertErr } = await supabase.from('room_bookings').insert({
      institution_id: institutionId, room_id: roomId, booked_by: userId,
      purpose: purpose.trim(), booking_date: date, start_time: startTime, end_time: endTime,
    } as unknown as never)
    setSubmitting(false)
    if (insertErr) { setError(insertErr.message); return }
    setPurpose('')
    await load()
  }

  async function cancel(id: string) {
    await supabase.from('room_bookings').update({ status: 'cancelled' } as unknown as never).eq('id', id)
    await load()
  }

  if (loading) return <LoadingView />

  const myBookings = bookings.filter(b => b.booked_by === userId)

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Room Booking" />

      <Card>
        <Text style={styles.sectionTitle}>Book a Room</Text>
        {rooms.length === 0 ? <Text style={styles.empty}>No rooms configured yet.</Text> : (
          <>
            <View style={styles.chipRow}>
              {rooms.map(r => (
                <Text key={r.id} onPress={() => setRoomId(r.id)} style={[styles.chip, roomId === r.id && styles.chipActive]}>
                  {r.room_number}
                </Text>
              ))}
            </View>
            <TextField value={purpose} onChangeText={setPurpose} placeholder="Purpose (e.g. Club meeting)" />
            <View style={{ height: 8 }} />
            <TextField value={date} onChangeText={setDate} placeholder="Date (YYYY-MM-DD)" />
            <View style={{ height: 8 }} />
            <TextField value={startTime} onChangeText={setStartTime} placeholder="Start (HH:MM)" />
            <View style={{ height: 8 }} />
            <TextField value={endTime} onChangeText={setEndTime} placeholder="End (HH:MM)" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={{ height: 8 }} />
            <PrimaryButton label="Book Room" onPress={submit} loading={submitting} disabled={!roomId || !purpose.trim()} />
          </>
        )}
      </Card>

      <Text style={styles.sectionTitle}>My Bookings ({myBookings.length})</Text>
      {myBookings.length === 0 ? <EmptyState text="No upcoming bookings." /> : myBookings.map(b => (
        <Card key={b.id}>
          <Text style={styles.title}>{b.campus_rooms?.room_number} — {b.purpose}</Text>
          <Text style={styles.meta}>{new Date(b.booking_date).toLocaleDateString()} · {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}</Text>
          <Text onPress={() => cancel(b.id)} style={styles.cancelLink}>Cancel</Text>
        </Card>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.grayLight, fontSize: 12, color: colors.gray, overflow: 'hidden' },
  chipActive: { backgroundColor: colors.blue, color: '#fff', fontWeight: '700' },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.gray, marginTop: 2 },
  empty: { fontSize: 13, color: colors.gray },
  error: { color: colors.red, fontSize: 12, marginTop: 4 },
  cancelLink: { color: colors.red, fontSize: 12, fontWeight: '700', marginTop: 8 },
})
