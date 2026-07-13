/**
 * Mirrors apps/web/app/student/results (StudentResultsPage).
 */
import { useCallback, useState } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, StatCard, ListRow, Badge, EmptyState, LoadingView } from '../../components/ui'

type ExamResult = {
  id: string; score: number; max_score: number; grade: string | null
  assessment_name: string; assessment_type: string | null; exam_date: string | null
  subjects: { name: string } | null
}

export default function StudentResultsScreen() {
  const [results, setResults] = useState<ExamResult[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', me.id).single()
    const studentId = (studentRaw as unknown as { id: string } | null)?.id ?? ''

    const { data } = await supabase
      .from('exam_results')
      .select('id, score, max_score, grade, assessment_name, assessment_type, exam_date, subjects(name)')
      .eq('student_id', studentId)
      .eq('is_published', true)
      .order('exam_date', { ascending: false })

    setResults((data ?? []) as unknown as ExamResult[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  const avgPct = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + (Number(r.score) / Number(r.max_score)) * 100, 0) / results.length)
    : 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Exam Results" />

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <StatCard label="Average Score" value={`${avgPct}%`} accent={colors.blue} />
        <StatCard label="Published" value={results.length} accent={colors.gray} />
      </View>

      {results.length === 0 ? (
        <EmptyState text="No published results yet." />
      ) : (
        <Card>
          {results.map(r => (
            <ListRow key={r.id}
              title={`${r.subjects?.name ?? '—'} · ${r.assessment_name}${r.assessment_type ? ` (${r.assessment_type})` : ''}`}
              subtitle={`${r.score} / ${r.max_score} · ${r.exam_date ? new Date(r.exam_date).toLocaleDateString() : '—'}`}
              right={r.grade ? <Badge label={r.grade} status={r.grade === 'A' ? 'approved' : r.grade === 'F' ? 'rejected' : 'pending'} /> : undefined}
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
