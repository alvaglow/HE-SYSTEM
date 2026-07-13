/**
 * Mirrors both apps/web/app/admin/kpi (full record table + recalc button)
 * and apps/web/app/management/kpi (aggregate top/bottom performers +
 * grade distribution) — merged: everyone sees the aggregate summary,
 * admin additionally gets the recalculate button and full records table.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { kpiCalculate } from '../../lib/edgeFunctions'
import { colors, ScreenHeader, Card, StatCard, ListRow, Badge, EmptyState, LoadingView, PrimaryButton } from '../../components/ui'

type KpiRecord = {
  id: string; period_year: number; period_month: number
  total_score: number | null; grade: string | null
  classes_conducted: number | null; attendance_rate: number | null
  tasks_completed: number | null; tasks_total: number | null
  users: { full_name: string | null; role?: string | null } | null
}

export default function KpiScreen() {
  const [role, setRole] = useState('admin')
  const [records, setRecords] = useState<KpiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [recalcError, setRecalcError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setRole(me.role)

    const { data } = await supabase
      .from('kpi_records')
      .select('id, period_year, period_month, total_score, grade, classes_conducted, attendance_rate, tasks_completed, tasks_total, users(full_name, role)')
      .eq('institution_id', me.institutionId)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(200)

    setRecords((data ?? []) as unknown as KpiRecord[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleRecalculate() {
    setRecalculating(true)
    setRecalcError('')
    try {
      const res = await kpiCalculate()
      if (res?.error) { setRecalcError(res.error); return }
      await load()
    } catch (e) {
      setRecalcError(e instanceof Error ? e.message : 'Failed to recalculate KPIs')
    } finally {
      setRecalculating(false)
    }
  }

  if (loading) return <LoadingView />

  const now = new Date()
  const thisMonth = records.filter(r => r.period_year === now.getFullYear() && r.period_month === now.getMonth() + 1)
  const scores = thisMonth.map(r => Number(r.total_score)).filter(n => !Number.isNaN(n))
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const gradeCounts = new Map<string, number>()
  for (const r of thisMonth) if (r.grade) gradeCounts.set(r.grade, (gradeCounts.get(r.grade) ?? 0) + 1)
  const ranked = [...thisMonth].sort((a, b) => Number(b.total_score ?? 0) - Number(a.total_score ?? 0))
  const top5 = ranked.slice(0, 5)
  const bottom5 = [...ranked].reverse().slice(0, 5)

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="KPI" />

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <StatCard label="Avg Score (Month)" value={avgScore != null ? `${avgScore}%` : '—'} accent={colors.purple} />
        <StatCard label="Records (Month)" value={thisMonth.length} accent={colors.blue} />
      </View>

      <Card>
        <Text style={styles.cardTitle}>Grade Distribution</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {['A', 'B', 'C', 'D', 'F'].map(g => (
            <Badge key={g} label={`${g}: ${gradeCounts.get(g) ?? 0}`} status={g === 'A' ? 'approved' : g === 'F' ? 'rejected' : 'pending'} />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Top Performers</Text>
        {top5.length === 0 ? <EmptyState text="No KPI records yet this month." /> : top5.map(r => (
          <ListRow key={r.id} title={r.users?.full_name ?? '—'} subtitle={r.users?.role ?? undefined}
            right={<Text style={styles.score}>{r.total_score != null ? Number(r.total_score).toFixed(1) : '—'}</Text>} />
        ))}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Needs Attention</Text>
        {bottom5.length === 0 ? <EmptyState text="No KPI records yet this month." /> : bottom5.map(r => (
          <ListRow key={r.id} title={r.users?.full_name ?? '—'} subtitle={r.users?.role ?? undefined}
            right={<Text style={styles.score}>{r.total_score != null ? Number(r.total_score).toFixed(1) : '—'}</Text>} />
        ))}
      </Card>

      {role !== 'management' && (
        <>
          <PrimaryButton label={recalculating ? 'Recalculating…' : 'Recalculate KPIs (last month)'} onPress={handleRecalculate} loading={recalculating} />
          {recalcError ? <Text style={styles.error}>{recalcError}</Text> : null}

          <Text style={styles.sectionLabel}>All Records ({records.length})</Text>
          {records.length === 0 ? (
            <EmptyState text="No KPI records yet. Run a recalculation above once teachers have taught classes." />
          ) : (
            <Card>
              {records.map(r => (
                <ListRow
                  key={r.id}
                  title={r.users?.full_name ?? '—'}
                  subtitle={`${r.period_year}-${String(r.period_month).padStart(2, '0')} · ${r.classes_conducted ?? '—'} classes · ${r.attendance_rate != null ? `${Number(r.attendance_rate).toFixed(1)}%` : '—'} attendance`}
                  right={r.grade ? <Badge label={r.grade} status={r.grade === 'A' ? 'approved' : r.grade === 'F' ? 'rejected' : 'pending'} /> : undefined}
                />
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
  score: { fontWeight: '700', color: colors.blue },
  error: { color: colors.red, fontSize: 12, marginTop: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
