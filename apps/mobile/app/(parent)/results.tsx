/**
 * Mirrors apps/web/app/parent/results (ParentResultsPage).
 */
import { useCallback, useState } from 'react'
import { Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView } from '../../components/ui'

type ExamResult = {
  id: string; assessment_name: string; assessment_type: string | null; score: number | null; max_score: number | null
  grade: string | null; exam_date: string | null; subjects: { name: string } | null
}
type ChildBlock = { id: string; name: string; results: ExamResult[] }

export default function ParentResultsScreen() {
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
      const { data: resultsRaw } = await supabase
        .from('exam_results')
        .select('id, assessment_name, assessment_type, score, max_score, grade, exam_date, subjects(name)')
        .eq('student_id', child.id)
        .eq('is_published', true)
        .order('exam_date', { ascending: false })
      return { id: child.id, name: child.users?.full_name ?? 'Child', results: (resultsRaw ?? []) as unknown as ExamResult[] }
    }))

    setBlocks(results)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Results" />
      {blocks.length === 0 ? (
        <EmptyState text="No children linked to your account yet. Contact admin." />
      ) : (
        blocks.map(b => (
          <Card key={b.id}>
            <Text style={styles.childHeader}>{b.name}</Text>
            {b.results.length === 0 ? (
              <EmptyState text="No published results yet." />
            ) : (
              b.results.map(r => (
                <ListRow key={r.id} title={`${r.subjects?.name ?? '—'} · ${r.assessment_name}${r.assessment_type ? ` (${r.assessment_type})` : ''}`}
                  subtitle={`${r.score != null && r.max_score != null ? `${r.score}/${r.max_score}` : '—'} · ${r.exam_date ? new Date(r.exam_date).toLocaleDateString() : '—'}`}
                  right={r.grade ? <Badge label={r.grade} status={r.grade === 'A' ? 'approved' : r.grade === 'F' ? 'rejected' : 'pending'} /> : undefined} />
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
