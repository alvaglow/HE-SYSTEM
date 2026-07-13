/**
 * Mirrors apps/web/app/admin/bookings — view-only list of all room
 * bookings across the institution. Shared by admin and management.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, EmptyState, LoadingView } from '../../components/ui'

type Booking = {
  id: string; purpose: string; booking_date: string; start_time: string; end_time: string; status: string
  campus_rooms: { room_number: string; building: string | null } | null
  users: { full_name: string | null; role: string } | null
}

export default function AdminBookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    const { data } = await supabase.from('room_bookings')
      .select('id, purpose, booking_date, start_time, end_time, status, campus_rooms(room_number, building), users!room_bookings_booked_by_fkey(full_name, role)')
      .eq('institution_id', me.institutionId)
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(200)
    setBookings((data ?? []) as unknown as Booking[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Room Bookings" />
      {bookings.length === 0 ? <EmptyState text="No bookings yet." /> : bookings.map(b => (
        <Card key={b.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={styles.title}>{b.campus_rooms?.room_number} — {b.purpose}</Text>
            <Text style={[styles.badge, b.status === 'confirmed' ? styles.badgeConfirmed : styles.badgeCancelled]}>{b.status}</Text>
          </View>
          <Text style={styles.meta}>
            {b.users?.full_name ?? '—'} ({b.users?.role}) · {new Date(b.booking_date).toLocaleDateString()} · {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
          </Text>
        </Card>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  meta: { fontSize: 12, color: colors.gray, marginTop: 4 },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden', textTransform: 'uppercase' },
  badgeConfirmed: { backgroundColor: colors.greenLight, color: colors.green },
  badgeCancelled: { backgroundColor: colors.grayLight, color: colors.gray },
})
