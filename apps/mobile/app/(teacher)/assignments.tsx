/**
 * Mirrors apps/web/app/teacher/assignments (create + list + grade, all on
 * one screen since mobile doesn't have a separate per-assignment route).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Assignment = {
  id: string; title: string; due_at: string | null; max_score: number; class_id: string
  classes: { title: string | null; subjects: { name: string } | null } | null
}
type Submission = {
  id: string; assignment_id: string; student_id: string; content: string | null; score: number | null
  feedback: string | null; graded_at: string | null; submitted_at: string
  students: { student_number: string; users: { full_name: string | null } | null } | null
}
type Option = { id: string; label: string }

export default function TeacherAssignmentsScreen() {
  const [teacherId, setTeacherId] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [classes, setClasses] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [classId, setClassId] = useState('')
  const [title, setTitle] = useState('')
  const [maxScore, setMaxScore] = useState('100')
  const [submitting, setSubmitting] = useState(false)
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, { score: string; feedback: string }>>({})
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)

    const { data: teacherRaw } = await supabase.from('teachers').select('id').eq('user_id', me.id).single()
    const tid = (teacherRaw as unknown as { id: string } | null)?.id ?? ''
    setTeacherId(tid)

    const [{ data: assignmentsRaw }, { data: submissionsRaw }, { data: classesRaw }] = await Promise.all([
      supabase.from('assignments').select('id, title, due_at, max_score, class_id, classes(title, subjects(name))').eq('teacher_id', tid).order('created_at', { ascending: false }),
      supabase.from('assignment_submissions').select('id, assignment_id, student_id, content, score, feedback, graded_at, submitted_at, students(student_number, users(full_name))').order('submitted_at', { ascending: true }),
      supabase.from('classes').select('id, title, subjects(name)').eq('teacher_id', tid),
    ])

    setAssignments((assignmentsRaw ?? []) as unknown as Assignment[])
    setSubmissions((submissionsRaw ?? []) as unknown as Submission[])
    const classOpts = ((classesRaw ?? []) as unknown as Array<{ id: string; title: string | null; subjects: { name: string } | null }>)
      .map(c => ({ id: c.id, label: c.title || c.subjects?.name || 'Class' }))
    setClasses(classOpts)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleCreate() {
    setSubmitting(true)
    setError('')
    const { error } = await supabase.from('assignments').insert({
      institution_id: institutionId, class_id: classId, teacher_id: teacherId, title, max_score: Number(maxScore),
    } as unknown as never)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    setClassId(''); setTitle(''); setMaxScore('100'); setOpen(false)
    await load()
  }

  async function saveGrade(submissionId: string) {
    const draft = gradeDrafts[submissionId]
    if (!draft) return
    await supabase.from('assignment_submissions').update({
      score: draft.score === '' ? null : Number(draft.score),
      feedback: draft.feedback || null,
      graded_by: teacherId,
      graded_at: new Date().toISOString(),
    } as unknown as never).eq('id', submissionId)
    await load()
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Assignments" />

      {classes.length === 0 ? (
        <EmptyState text="You don't have any classes yet." />
      ) : !open ? (
        <PrimaryButton label="+ New Assignment" onPress={() => setOpen(true)} />
      ) : (
        <Card>
          <Text style={styles.cardTitle}>New Assignment</Text>
          <View style={styles.chipRow}>
            {classes.map(c => (
              <Text key={c.id} onPress={() => setClassId(c.id)} style={[chipStyles.chip, classId === c.id ? chipStyles.chipActive : null]}>{c.label}</Text>
            ))}
          </View>
          <TextField value={title} onChangeText={setTitle} placeholder="Assignment title" />
          <TextField value={maxScore} onChangeText={setMaxScore} placeholder="Max score" keyboardType="numeric" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Create Assignment" onPress={handleCreate} loading={submitting} disabled={!classId || !title} />
          <Text onPress={() => setOpen(false)} style={styles.cancelLink}>Cancel</Text>
        </Card>
      )}

      <Text style={styles.sectionLabel}>Your Assignments ({assignments.length})</Text>
      {assignments.length === 0 ? (
        <EmptyState text="No assignments created yet." />
      ) : (
        <Card>
          {assignments.map(a => {
            const subs = submissions.filter(s => s.assignment_id === a.id)
            const graded = subs.filter(s => s.graded_at).length
            return (
              <View key={a.id}>
                <ListRow
                  title={a.title}
                  subtitle={`${a.classes?.title || a.classes?.subjects?.name || 'Class'} · ${subs.length} submitted · ${graded} graded`}
                  onPress={() => setExpanded(expanded === a.id ? null : a.id)}
                />
                {expanded === a.id && (
                  <View style={styles.expandBox}>
                    {subs.length === 0 ? (
                      <Text style={styles.empty}>No submissions yet.</Text>
                    ) : subs.map(s => {
                      const draft = gradeDrafts[s.id] ?? { score: s.score != null ? String(s.score) : '', feedback: s.feedback ?? '' }
                      return (
                        <View key={s.id} style={styles.subRow}>
                          <Text style={styles.subName}>{s.students?.users?.full_name ?? s.students?.student_number ?? '—'}</Text>
                          {s.content ? <Text style={styles.subContent}>{s.content}</Text> : null}
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                            <TextField value={draft.score} onChangeText={v => setGradeDrafts(d => ({ ...d, [s.id]: { ...draft, score: v } }))} placeholder={`/ ${a.max_score}`} keyboardType="numeric" />
                          </View>
                          <TextField value={draft.feedback} onChangeText={v => setGradeDrafts(d => ({ ...d, [s.id]: { ...draft, feedback: v } }))} placeholder="Feedback (optional)" />
                          <Text onPress={() => saveGrade(s.id)} style={styles.saveGradeLink}>
                            {s.graded_at ? `Graded: ${s.score}/${a.max_score} (tap to update)` : 'Save Grade'}
                          </Text>
                        </View>
                      )
                    })}
                  </View>
                )}
              </View>
            )
          })}
        </Card>
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  error: { color: colors.red, fontSize: 12, marginBottom: 8 },
  cancelLink: { textAlign: 'center', color: colors.gray, fontSize: 13, marginTop: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { fontSize: 13, color: colors.muted, paddingVertical: 8 },
  expandBox: { paddingHorizontal: 12, paddingBottom: 10, backgroundColor: colors.grayLight, borderRadius: 8, marginBottom: 8 },
  subRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bg },
  subName: { fontSize: 13, fontWeight: '700', color: colors.text },
  subContent: { fontSize: 12, color: colors.gray, marginTop: 2 },
  saveGradeLink: { fontSize: 12, color: colors.blue, fontWeight: '600', marginTop: 6 },
})
