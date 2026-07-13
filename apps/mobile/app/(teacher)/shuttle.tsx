/**
 * Mirrors apps/web/app/teacher/shuttle (TeacherShuttlePage).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, EmptyState, LoadingView } from '../../components/ui'

type Route = { id: string; route_name: string; stops: string[]; departure_times: string[]; notes: string | null }

export default function TeacherShuttleScreen() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    const { data } = await supabase.from('shuttle_routes').select('id, route_name, stops, departure_times, notes')
      .eq('institution_id', me.institutionId).eq('is_active', true).order('route_name', { ascending: true })
    setRoutes((data ?? []) as unknown as Route[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Campus Shuttle" />
      {routes.length === 0 ? (
        <EmptyState text="No shuttle routes published yet." />
      ) : (
        <Card>
          {routes.map(r => (
            <View key={r.id} style={styles.row}>
              <Text style={styles.routeName}>{r.route_name}</Text>
              <Text style={styles.stops}>{r.stops.join(' → ')}</Text>
              <View style={styles.chipRow}>
                {r.departure_times.map((t, i) => <Text key={i} style={styles.chip}>{t}</Text>)}
              </View>
              {r.notes ? <Text style={styles.notes}>{r.notes}</Text> : null}
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  routeName: { fontSize: 14, fontWeight: '700', color: colors.text },
  stops: { fontSize: 12, color: colors.gray, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 6 },
  chip: { fontSize: 11, color: colors.blue, backgroundColor: colors.blueLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  notes: { fontSize: 11, color: colors.muted, marginTop: 6 },
})
