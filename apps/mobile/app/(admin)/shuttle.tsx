/**
 * Mirrors apps/web/app/admin/shuttle (ShuttleManager).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Route = { id: string; route_name: string; stops: string[]; departure_times: string[]; is_active: boolean }

export default function ShuttleManagerScreen() {
  const [institutionId, setInstitutionId] = useState('')
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [routeName, setRouteName] = useState('')
  const [stops, setStops] = useState('')
  const [departureTimes, setDepartureTimes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)
    const { data } = await supabase.from('shuttle_routes').select('id, route_name, stops, departure_times, is_active').eq('institution_id', me.institutionId).order('route_name', { ascending: true })
    setRoutes((data ?? []) as unknown as Route[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleCreate() {
    setSubmitting(true)
    setError('')
    const { error } = await supabase.from('shuttle_routes').insert({
      institution_id: institutionId, route_name: routeName,
      stops: stops.split(',').map(s => s.trim()).filter(Boolean),
      departure_times: departureTimes.split(',').map(t => t.trim()).filter(Boolean),
      is_active: true,
    } as unknown as never)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    setRouteName(''); setStops(''); setDepartureTimes(''); setOpen(false)
    await load()
  }

  async function toggleActive(r: Route) {
    await supabase.from('shuttle_routes').update({ is_active: !r.is_active } as unknown as never).eq('id', r.id)
    await load()
  }

  async function remove(id: string) {
    await supabase.from('shuttle_routes').delete().eq('id', id)
    await load()
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Campus Shuttle" />
      {!open ? (
        <PrimaryButton label="+ Add Route" onPress={() => setOpen(true)} />
      ) : (
        <Card>
          <Text style={styles.cardTitle}>New Shuttle Route</Text>
          <TextField value={routeName} onChangeText={setRouteName} placeholder="Route name" />
          <TextField value={stops} onChangeText={setStops} placeholder="Stops, comma-separated" />
          <TextField value={departureTimes} onChangeText={setDepartureTimes} placeholder="Departure times, comma-separated" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Add Route" onPress={handleCreate} loading={submitting} disabled={!routeName || !stops || !departureTimes} />
          <Text onPress={() => setOpen(false)} style={styles.cancelLink}>Cancel</Text>
        </Card>
      )}

      <Text style={styles.sectionLabel}>All Routes ({routes.length})</Text>
      {routes.length === 0 ? (
        <EmptyState text="No shuttle routes added yet." />
      ) : (
        routes.map(r => (
          <Card key={r.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeTitle}>{r.route_name}</Text>
                <Text style={styles.routeSub}>{r.stops.join(' → ')}</Text>
                <Text style={styles.routeSub}>Departures: {r.departure_times.join(', ')}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
  error: { color: colors.red, fontSize: 12, marginBottom: 8 },
  cancelLink: { textAlign: 'center', color: colors.gray, fontSize: 13, marginTop: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  routeTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  routeSub: { fontSize: 12, color: colors.gray, marginTop: 2 },
  actionLink: { fontSize: 12, color: colors.blue, fontWeight: '600' },
})
