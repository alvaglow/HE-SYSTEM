/**
 * Mirrors apps/web/app/student/location (StudentLocationPage) — read-only
 * history. The actual live check-in flow lives at app/(student)/checkin.tsx.
 */
import { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, ListRow, EmptyState, LoadingView } from '../../components/ui'

type Checkin = {
  id: string; marked_at: string | null; distance_meters: number | null
  classes: { title: string | null; location_name: string | null; location_address: string | null; subjects: { name: string } | null } | null
}

export default function StudentLocationScreen() {
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', me.id).single()
    const studentId = (studentRaw as unknown as { id: string } | null)?.id ?? ''

    const { data } = await supabase
      .from('attendance_records')
      .select('id, marked_at, distance_meters, classes(title, location_name, location_address, subjects(name))')
      .eq('student_id', studentId)
      .eq('check_in_method', 'gps_biometric')
      .order('marked_at', { ascending: false })
      .limit(50)

    setCheckins((data ?? []) as unknown as Checkin[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Location Check-In History" subtitle="Read-only history of your GPS/biometric check-ins." />
      {checkins.length === 0 ? (
        <EmptyState text="No GPS/biometric check-ins recorded yet." />
      ) : (
        <Card>
          {checkins.map(c => (
            <ListRow key={c.id}
              title={c.classes?.title || c.classes?.subjects?.name || 'Class'}
              subtitle={`${c.classes?.location_name || c.classes?.location_address || '—'} · ${c.distance_meters != null ? `${c.distance_meters}m from zone center` : '—'} · ${c.marked_at ? new Date(c.marked_at).toLocaleString() : '—'}`}
            />
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
})
