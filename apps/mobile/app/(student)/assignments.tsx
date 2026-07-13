/**
 * Mirrors apps/web/app/student/assignments (StudentAssignmentsPage + SubmitForm).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { pickAndUpload } from '../../lib/uploadFile'
import { colors, ScreenHeader, Card, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Assignment = {
  id: string; title: string; description: string | null; due_at: string | null; max_score: number
  classes: { title: string | null; subjects: { name: string } | null } | null
}
type Submission = {
  id: string; assignment_id: string; content: string | null; score: number | null
  feedback: string | null; graded_at: string | null
}

export default function StudentAssignmentsScreen() {
  const [studentId, setStudentId] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [attachedFiles, setAttachedFiles] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)

    const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', me.id).single()
    const sid = (studentRaw as unknown as { id: string } | null)?.id ?? ''
    setStudentId(sid)

    const [{ data: assignmentsRaw }, { data: submissionsRaw }] = await Promise.all([
      supabase.from('assignments').select('id, title, description, due_at, max_score, classes(title, subjects(name))').order('due_at', { ascending: true, nullsFirst: false }),
      supabase.from('assignment_submissions').select('id, assignment_id, content, score, feedback, graded_at').eq('student_id', sid),
    ])
    setAssignments((assignmentsRaw ?? []) as unknown as Assignment[])
    setSubmissions((submissionsRaw ?? []) as unknown as Submission[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleAttach(assignmentId: string) {
    const { path, error: uploadErr } = await pickAndUpload('assignment-submissions', `${institutionId}/assignment-submissions`)
    if (uploadErr) { setError(uploadErr); return }
    if (path) setAttachedFiles(f => ({ ...f, [assignmentId]: path }))
  }

  async function handleSubmit(assignmentId: string, existingId: string | null) {
    setSubmitting(assignmentId)
    setError('')
    const payload = {
      assignment_id: assignmentId,
      student_id: studentId,
      content: drafts[assignmentId] || null,
      ...(attachedFiles[assignmentId] ? { file_path: attachedFiles[assignmentId] } : {}),
      submitted_at: new Date().toISOString(),
    }
    const { error } = existingId
      ? await supabase.from('assignment_submissions').update(payload as unknown as never).eq('id', existingId)
      : await supabase.from('assignment_submissions').insert(payload as unknown as never)
    setSubmitting(null)
    if (error) { setError(error.message); return }
    await load()
  }

  if (loading) return <LoadingView />

  const byAssignment = new Map(submissions.map(s => [s.assignment_id, s]))
  const now = Date.now()

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Assignments" />

      {assignments.length === 0 ? (
        <EmptyState text="No assignments yet." />
      ) : assignments.map(a => {
        const sub = byAssignment.get(a.id)
        const overdue = a.due_at && new Date(a.due_at).getTime() < now && !sub
        return (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{a.title}</Text>
                <Text style={styles.meta}>
                  {a.classes?.title || a.classes?.subjects?.name || 'Class'}
                  {a.due_at ? ` · Due ${new Date(a.due_at).toLocaleString()}` : ' · No due date'}
                </Text>
              </View>
              <Text style={[
                styles.badge,
                sub?.graded_at ? styles.badgeGraded : sub ? styles.badgeSubmitted : overdue ? styles.badgeOverdue : styles.badgeNone,
              ]}>
                {sub?.graded_at ? `${sub.score}/${a.max_score}` : sub ? 'SUBMITTED' : overdue ? 'OVERDUE' : 'NOT SUBMITTED'}
              </Text>
            </View>
            {a.description ? <Text style={styles.description}>{a.description}</Text> : null}

            {sub?.graded_at ? (
              <View style={styles.gradedBox}>
                <Text style={styles.gradedScore}>Score: {sub.score} / {a.max_score}</Text>
                {sub.feedback ? <Text style={styles.gradedFeedback}>{sub.feedback}</Text> : null}
              </View>
            ) : (
              <View style={{ marginTop: 8 }}>
                <TextField value={drafts[a.id] ?? sub?.content ?? ''} onChangeText={v => setDrafts(d => ({ ...d, [a.id]: v }))} placeholder="Write your answer…" multiline />
                <Text onPress={() => handleAttach(a.id)} style={styles.attachLink}>
                  {attachedFiles[a.id] ? 'File attached ✓' : '📎 Attach file (optional)'}
                </Text>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <PrimaryButton
                  label={sub ? 'Resubmit' : 'Submit'}
                  onPress={() => handleSubmit(a.id, sub?.id ?? null)}
                  loading={submitting === a.id}
                  disabled={!drafts[a.id] && !attachedFiles[a.id] && !sub?.content}
                />
              </View>
            )}
          </Card>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.gray, marginTop: 2 },
  description: { fontSize: 13, color: colors.gray, marginTop: 8 },
  badge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  badgeGraded: { backgroundColor: colors.greenLight, color: colors.green },
  badgeSubmitted: { backgroundColor: colors.blueLight, color: colors.blue },
  badgeOverdue: { backgroundColor: colors.redLight, color: colors.red },
  badgeNone: { backgroundColor: colors.grayLight, color: colors.gray },
  gradedBox: { backgroundColor: colors.greenLight, borderRadius: 8, padding: 10, marginTop: 8 },
  gradedScore: { fontSize: 13, fontWeight: '700', color: colors.green },
  gradedFeedback: { fontSize: 12, color: colors.green, marginTop: 2 },
  attachLink: { fontSize: 13, color: colors.blue, marginVertical: 8 },
  error: { color: colors.red, fontSize: 12, marginBottom: 6 },
})
