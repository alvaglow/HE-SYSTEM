/**
 * Mirrors apps/web/app/student/exams (ExamCalendarView) — read-only list.
 * The web version can export a .ics file for calendar sync; that requires a
 * file-system/share dependency this app doesn't have yet, so the mobile
 * screen sticks to the list view for now.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, EmptyState, LoadingView } from '../../components/ui'

type Exam = {
  id: string; exam_date: string; start_time: string; end_time: string; venue: string | null; notes: string | null
  programme_id: string | null; subjects: { name: string } | null
}

export default function StudentExamsScreen() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: studentRaw } = await supabase.from('students').select('programme_id').eq('user_id', me.id).single()
    const programmeId = (studentRaw as unknown as { programme_id: string | null } | null)?.programme_id ?? null

    const { data } = await supabase
      .from('exam_timetable')
      .select('id, exam_date, start_time, end_time, venue, notes, programme_id, subjects(name)')
      .eq('institution_id', me.institutionId)
      .order('exam_date', { ascending: true })

    const all = (data ?? []) as unknown as Exam[]
    setExams(all.filter(e => !e.programme_id || e.programme_id === programmeId))
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
        exams.map(e => (
          <Card key={e.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={styles.examTitle}>{e.subjects?.name ?? 'Exam'}</Text>
                <Text style={styles.examSub}>{e.venue ?? 'Venue TBA'}</Text>
                {e.notes && <Text style={styles.examSub}>{e.notes}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.examDate}>{new Date(e.exam_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                <Text style={styles.examSub}>{e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}</Text>
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
  examTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  examSub: { fontSize: 12, color: colors.gray, marginTop: 2 },
  examDate: { fontSize: 13, fontWeight: '600', color: colors.blue },
})
