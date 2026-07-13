/**
 * Mirrors apps/web/app/teacher/kpi (TeacherKpiPage) — own KPI history with
 * 4-pillar breakdown.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, StatCard, ListRow, Badge, EmptyState, LoadingView } from '../../components/ui'

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type KpiRecord = {
  id: string; period_year: number; period_month: number
  pillar1_score: number | null; pillar2_score: number | null; pillar3_score: number | null; pillar4_score: number | null
  total_score: number | null; grade: string | null; teaching_hours: number | null; classes_conducted: number | null
  attendance_rate: number | null; pass_rate: number | null; tasks_completed: number | null; tasks_total: number | null
  training_hours: number | null; notes: string | null
}

export default function TeacherKpiScreen() {
  const [records, setRecords] = useState<KpiRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data } = await supabase
      .from('kpi_records')
      .select('id, period_year, period_month, pillar1_score, pillar2_score, pillar3_score, pillar4_score, total_score, grade, teaching_hours, classes_conducted, attendance_rate, pass_rate, tasks_completed, tasks_total, training_hours, notes')
      .eq('user_id', me.id)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })

    setRecords((data ?? []) as unknown as KpiRecord[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  const latest = records[0]

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="My KPI" />

      {!latest ? (
        <EmptyState text="No KPI data recorded yet." />
      ) : (
        <>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={styles.periodLabel}>{MONTH_NAMES[latest.period_month]} {latest.period_year}</Text>
                <Text style={styles.scoreValue}>{latest.total_score ?? '—'}</Text>
              </View>
              {latest.grade ? <Badge label={latest.grade} status={latest.grade === 'A' ? 'approved' : latest.grade === 'F' ? 'rejected' : 'pending'} /> : null}
            </View>
          </Card>

          <Card>
            <Text style={styles.cardTitle}>Pillar Breakdown</Text>
            <View style={styles.pillarGrid}>
              <PillarStat label="Pillar 1" value={latest.pillar1_score} />
              <PillarStat label="Pillar 2" value={latest.pillar2_score} />
              <PillarStat label="Pillar 3" value={latest.pillar3_score} />
              <PillarStat label="Pillar 4" value={latest.pillar4_score} />
            </View>
            <View style={styles.pillarGrid}>
              <PillarStat label="Teaching Hrs" value={latest.teaching_hours} />
              <PillarStat label="Classes" value={latest.classes_conducted} />
              <PillarStat label="Attendance" value={latest.attendance_rate != null ? `${latest.attendance_rate}%` : null} />
              <PillarStat label="Pass Rate" value={latest.pass_rate != null ? `${latest.pass_rate}%` : null} />
            </View>
            <View style={styles.pillarGrid}>
              <PillarStat label="Tasks" value={`${latest.tasks_completed ?? 0}/${latest.tasks_total ?? 0}`} />
              <PillarStat label="Training Hrs" value={latest.training_hours} />
            </View>
            {latest.notes ? <Text style={styles.notes}>{latest.notes}</Text> : null}
          </Card>
        </>
      )}

      <Text style={styles.sectionLabel}>History ({records.length})</Text>
      {records.length === 0 ? (
        <EmptyState text="No history yet." />
      ) : (
        <Card>
          {records.map(k => (
            <ListRow key={k.id}
              title={`${MONTH_NAMES[k.period_month]} ${k.period_year}`}
              subtitle={`Attendance ${k.attendance_rate != null ? `${k.attendance_rate}%` : '—'} · Pass rate ${k.pass_rate != null ? `${k.pass_rate}%` : '—'}`}
              right={
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.historyScore}>{k.total_score ?? '—'}</Text>
                  {k.grade ? <Badge label={k.grade} status={k.grade === 'A' ? 'approved' : k.grade === 'F' ? 'rejected' : 'pending'} /> : null}
                </View>
              }
            />
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

function PillarStat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <View style={styles.pillarBox}>
      <Text style={styles.pillarLabel}>{label}</Text>
      <Text style={styles.pillarValue}>{value ?? '—'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  periodLabel: { fontSize: 11, color: colors.gray, marginBottom: 4 },
  scoreValue: { fontSize: 26, fontWeight: '700', color: colors.blue },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
  pillarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  pillarBox: { width: '22%' },
  pillarLabel: { fontSize: 10, color: colors.gray, marginBottom: 2 },
  pillarValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  notes: { fontSize: 12, color: colors.gray, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.grayLight },
  historyScore: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
