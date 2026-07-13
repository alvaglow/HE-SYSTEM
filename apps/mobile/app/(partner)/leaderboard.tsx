/**
 * Mirrors apps/web/app/partner/leaderboard (PartnerLeaderboardPage), backed
 * by the get_partner_leaderboard() RPC (SECURITY DEFINER — see migration 005
 * comments for why anon access to it was revoked).
 */
import { useCallback, useState } from 'react'
import { Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView } from '../../components/ui'

type Row = { id: string; company_name: string | null; full_name: string | null; tier: string | null; total_recruited: number | null; is_self: boolean }

export default function LeaderboardScreen() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_partner_leaderboard' as never)
    setRows((data ?? []) as unknown as Row[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Leaderboard" subtitle="Ranked by students recruited. Earnings are kept private between partners." />
      {rows.length === 0 ? (
        <EmptyState text="No partners to rank yet." />
      ) : (
        <Card>
          {rows.map((p, i) => (
            <ListRow key={p.id}
              title={`#${i + 1}  ${p.company_name || p.full_name || '—'}${p.is_self ? ' (You)' : ''}`}
              subtitle={`${p.total_recruited ?? 0} recruited`}
              right={<Badge label={(p.tier ?? 'starter').toUpperCase()} />}
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
