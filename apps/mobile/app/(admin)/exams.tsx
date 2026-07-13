/**
 * Mirrors apps/web/app/admin/exams (ExamsManager).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Exam = {
  id: string; exam_date: string; start_time: string; end_time: string; venue: string | null
  subjects: { name: string } | null; programmes: { name: string } | null
}
type Option = { id: string; name: string }

export default function ExamsManagerScreen() {
  const [institutionId, setInstitutionId] = useState('')
  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [subjectId, setSubjectId] = useState('')
  const [examDate, setExamDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venue, setVenue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)
    const [{ data: examsRaw }, { data: subjectsRaw }] = await Promise.all([
      supabase.from('exam_timetable').select('id, exam_date, start_time, end_time, venue, subjects(name), programmes(name)').eq('institution_id', me.institutionId).order('exam_date', { ascending: true }),
      supabase.from('subjects').select('id, name').eq('institution_id', me.institutionId).eq('is_active', true),
    ])
    setExams((examsRaw ?? []) as unknown as Exam[])
    setSubjects((subjectsRaw ?? []) as unknown as Option[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleCreate() {
    setSubmitting(true)
    setError('')
    const { error } = await supabase.from('exam_timetable').insert({
      institution_id: institutionId, subject_id: subjectId || null,
      exam_date: examDate, start_time: startTime, end_time: endTime, venue: venue || null,
    } as unknown as never)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    setSubjectId(''); setExamDate(''); setStartTime(''); setEndTime(''); setVenue(''); setOpen(false)
    await load()
  }

  async function remove(id: string) {
    await supabase.from('exam_timetable').delete().eq('id', id)
    await load()
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Exam Timetable" />
      {!open ? (
        <PrimaryButton label="+ Schedule Exam" onPress={() => setOpen(true)} />
      ) : (
        <Card>
          <Text style={styles.cardTitle}>New Exam</Text>
          <Text style={styles.label}>Subject</Text>
          <View style={styles.chipRow}>
            {subjects.map(s => (
              <Text key={s.id} onPress={() => setSubjectId(s.id)} style={[chipStyles.chip, subjectId === s.id ? chipStyles.chipActive : null]}>{s.name}</Text>
            ))}
          </View>
          <TextField value={examDate} onChangeText={setExamDate} placeholder="Date (YYYY-MM-DD)" />
          <TextField value={startTime} onChangeText={setStartTime} placeholder="Start time (HH:mm)" />
          <TextField value={endTime} onChangeText={setEndTime} placeholder="End time (HH:mm)" />
          <TextField value={venue} onChangeText={setVenue} placeholder="Venue (optional)" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Schedule Exam" onPress={handleCreate} loading={submitting} disabled={!subjectId || !examDate || !startTime || !endTime} />
          <Text onPress={() => setOpen(false)} style={styles.cancelLink}>Cancel</Text>
        </Card>
      )}

      <Text style={styles.sectionLabel}>All Exams ({exams.length})</Text>
      {exams.length === 0 ? (
        <EmptyState text="No exams scheduled yet." />
      ) : (
        exams.map(e => (
          <Card key={e.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={styles.examTitle}>{e.subjects?.name ?? 'Exam'}</Text>
                <Text style={styles.examSub}>{new Date(e.exam_date).toLocaleDateString()} · {e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}</Text>
                {e.venue && <Text style={styles.examSub}>{e.venue}</Text>}
              </View>
              <Text onPress={() => remove(e.id)} style={styles.actionLink}>Delete</Text>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const chipStyles = StyleSheet.create({
  chip: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.grayLight, color: colors.gray, marginRight: 6, marginBottom: 6, overflow: 'hidden' },
  chipActive: { backgroundColor: colors.blue, color: colors.white },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
  label: { fontSize: 12, color: colors.gray, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  error: { color: colors.red, fontSize: 12, marginBottom: 8 },
  cancelLink: { textAlign: 'center', color: colors.gray, fontSize: 13, marginTop: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  examTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  examSub: { fontSize: 12, color: colors.gray, marginTop: 2 },
  actionLink: { fontSize: 12, color: colors.red, fontWeight: '600' },
})
