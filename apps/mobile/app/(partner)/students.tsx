/**
 * Mirrors apps/web/app/partner/students (PartnerStudentsPage).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, StatCard, ListRow, Badge, EmptyState, LoadingView } from '../../components/ui'

type Recruit = {
  id: string; student_name: string | null; student_email: string | null; status: string | null
  tuition_fee: number | null; enrolled_at: string | null; created_at: string
}

const STATUSES = ['prospect', 'applied', 'enrolled', 'dropped']

export default function PartnerStudentsScreen() {
  const [recruits, setRecruits] = useState<Recruit[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: partnerRaw } = await supabase.from('partners').select('id').eq('user_id', me.id).single()
    const partnerId = (partnerRaw as unknown as { id: string } | null)?.id ?? ''

    const { data } = await supabase
      .from('partner_recruits')
      .select('id, student_name, student_email, status, tuition_fee, enrolled_at, created_at')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })

    setRecruits((data ?? []) as unknown as Recruit[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  const counts: Record<string, number> = {}
  for (const r of recruits) {
    const s = r.status ?? 'prospect'
    counts[s] = (counts[s] ?? 0) + 1
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Recruited Students" />

      <View style={styles.statsGrid}>
        {STATUSES.map(s => (
          <View key={s} style={styles.statBox}>
            <StatCard label={s.charAt(0).toUpperCase() + s.slice(1)} value={counts[s] ?? 0} accent={colors.blue} />
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Roster ({recruits.length})</Text>
      {recruits.length === 0 ? (
        <EmptyState text="No students recruited yet." />
      ) : (
        <Card>
          {recruits.map(r => (
            <ListRow key={r.id}
              title={r.student_name ?? '—'}
              subtitle={`${r.student_email ?? '—'} · ${r.tuition_fee != null ? `RM${Number(r.tuition_fee).toLocaleString()}` : '—'} · ${new Date(r.created_at).toLocaleDateString()}`}
              right={<Badge label={(r.status ?? 'prospect').toUpperCase()} status={r.status ?? 'prospect'} />}
            />
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  statBox: { width: '47%' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
