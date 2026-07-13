/**
 * Mirrors apps/web/app/parent/location (ParentLocationPage) — history of
 * GPS/biometric check-ins, not a live tracker (same disclaimer as web).
 */
import { useCallback, useState } from 'react'
import { Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, ListRow, EmptyState, LoadingView } from '../../components/ui'

type CheckinRecord = {
  id: string; marked_at: string | null; latitude: number | null; longitude: number | null; distance_meters: number | null
  classes: { title: string | null; location_name: string | null; location_address: string | null; subjects: { name: string } | null } | null
}
type ChildBlock = { id: string; name: string; records: CheckinRecord[] }

export default function ParentLocationScreen() {
  const [blocks, setBlocks] = useState<ChildBlock[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: linksRaw } = await supabase
      .from('parent_student_links')
      .select('students(id, users(full_name))')
      .eq('parent_user_id', me.id)
    const links = (linksRaw ?? []) as unknown as Array<{ students: { id: string; users: { full_name: string | null } | null } | null }>
    const children = links.map(l => l.students).filter((s): s is { id: string; users: { full_name: string | null } | null } => !!s)

    const results = await Promise.all(children.map(async child => {
      const { data: recordsRaw } = await supabase
        .from('attendance_records')
        .select('id, marked_at, latitude, longitude, distance_meters, classes(title, location_name, location_address, subjects(name))')
        .eq('student_id', child.id)
        .eq('check_in_method', 'gps_biometric')
        .order('marked_at', { ascending: false })
        .limit(20)
      return { id: child.id, name: child.users?.full_name ?? 'Child', records: (recordsRaw ?? []) as unknown as CheckinRecord[] }
    }))

    setBlocks(results)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Location Check-ins" subtitle="Recorded only for GPS/biometric classes, at the moment of check-in — this is a history, not a live tracker." />
      {blocks.length === 0 ? (
        <EmptyState text="No children linked to your account yet. Contact admin." />
      ) : (
        blocks.map(b => (
          <Card key={b.id}>
            <Text style={styles.childHeader}>{b.name}</Text>
            {b.records.length === 0 ? (
              <EmptyState text="No GPS/biometric check-ins recorded yet." />
            ) : (
              b.records.map(r => (
                <ListRow key={r.id} title={r.classes?.title || r.classes?.subjects?.name || '—'}
                  subtitle={`${r.classes?.location_name || r.classes?.location_address || '—'} · ${r.distance_meters != null ? `${r.distance_meters}m from zone center` : '—'} · ${r.marked_at ? new Date(r.marked_at).toLocaleString() : '—'}`} />
              ))
            )}
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  childHeader: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
})
