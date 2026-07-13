/**
 * Mirrors apps/web/app/teacher/exams (TeacherExamsPage).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, EmptyState, LoadingView } from '../../components/ui'

type Exam = { id: string; exam_date: string; start_time: string; end_time: string; venue: string | null; notes: string | null; subjects: { name: string } | null }

export default function TeacherExamsScreen() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    const { data } = await supabase.from('exam_timetable').select('id, exam_date, start_time, end_time, venue, notes, subjects(name)')
      .eq('institution_id', me.institutionId).order('exam_date', { ascending: true })
    setExams((data ?? []) as unknown as Exam[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Exam Timetable" />
      {exams.length === 0 ? (
        <EmptyState text="No exams scheduled yet." />
      ) : (
        <Card>
          {exams.map(e => (
            <View key={e.id} style={styles.row}>
              <Text style={styles.subject}>{e.subjects?.name ?? 'Exam'}</Text>
              <Text style={styles.meta}>{e.venue ?? 'Venue TBA'} · {new Date(e.exam_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}</Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  subject: { fontSize: 14, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.gray, marginTop: 2 },
})
