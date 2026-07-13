/**
 * Mirrors apps/web/app/student/shuttle.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, EmptyState, LoadingView } from '../../components/ui'

type Route = { id: string; route_name: string; stops: string[]; departure_times: string[]; notes: string | null }

export default function StudentShuttleScreen() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    const { data } = await supabase
      .from('shuttle_routes').select('id, route_name, stops, departure_times, notes')
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
        routes.map(r => (
          <Card key={r.id}>
            <Text style={styles.routeTitle}>{r.route_name}</Text>
            <Text style={styles.routeSub}>{r.stops.join(' → ')}</Text>
            <View style={styles.chipRow}>
              {r.departure_times.map((t, i) => <Text key={i} style={styles.chip}>{t}</Text>)}
            </View>
            {r.notes && <Text style={styles.routeSub}>{r.notes}</Text>}
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  routeTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  routeSub: { fontSize: 12, color: colors.gray, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.blueLight, color: colors.blue, overflow: 'hidden' },
})
