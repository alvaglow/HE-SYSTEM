/**
 * Mirrors apps/web/app/admin/audit-log (AuditLogPage), condensed to the
 * latest 50 entries with no pagination — mobile is a quick-glance view,
 * full filtering/paging lives on web.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, EmptyState, LoadingView } from '../../components/ui'

type Entry = {
  id: string; action: string; resource_type: string | null; resource_id: string | null; created_at: string
  users: { full_name: string | null; email: string } | null
}

export default function AuditLogScreen() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    const { data } = await supabase.from('audit_log')
      .select('id, action, resource_type, resource_id, created_at, users(full_name, email)')
      .eq('institution_id', me.institutionId)
      .order('created_at', { ascending: false })
      .limit(50)
    setEntries((data ?? []) as unknown as Entry[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Audit Log" />
      <Text style={styles.note}>Latest 50 entries. Use the web dashboard to filter or page through older activity.</Text>
      {entries.length === 0 ? (
        <EmptyState text="No audit log entries yet." />
      ) : (
        <Card>
          {entries.map(e => (
            <View key={e.id} style={styles.row}>
              <Text style={styles.action}>{e.action}</Text>
              <Text style={styles.meta}>
                {e.users?.full_name ?? e.users?.email ?? 'System'} · {e.resource_type ?? '—'} · {new Date(e.created_at).toLocaleString()}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  note: { fontSize: 12, color: colors.gray, marginBottom: 12 },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  action: { fontSize: 13, fontWeight: '700', color: colors.text },
  meta: { fontSize: 11, color: colors.gray, marginTop: 2 },
})
