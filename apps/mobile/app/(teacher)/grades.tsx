/**
 * Mirrors apps/web/app/teacher/grades (TeacherGradesPage + AddResultForm).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { pickAndUpload } from '../../lib/uploadFile'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Result = {
  id: string; score: number; max_score: number; grade: string | null
  assessment_name: string; assessment_type: string | null; exam_date: string | null; is_published: boolean
  attachment_url: string | null
  students: { student_number: string; users: { full_name: string | null } | null } | null
  subjects: { name: string } | null
}
type Option = { id: string; label: string }

export default function GradesScreen() {
  const [teacherId, setTeacherId] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const [students, setStudents] = useState<Option[]>([])
  const [subjects, setSubjects] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [assessmentName, setAssessmentName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [score, setScore] = useState('')
  const [maxScore, setMaxScore] = useState('100')
  const [grade, setGrade] = useState('')
  const [attachedFile, setAttachedFile] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)

    const { data: teacherRaw } = await supabase.from('teachers').select('id').eq('user_id', me.id).single()
    const tid = (teacherRaw as unknown as { id: string } | null)?.id ?? ''
    setTeacherId(tid)

    const [{ data: resultsRaw }, { data: classesRaw }] = await Promise.all([
      supabase.from('exam_results')
        .select('id, score, max_score, grade, assessment_name, assessment_type, exam_date, is_published, attachment_url, students(student_number, users(full_name)), subjects(name)')
        .eq('teacher_id', tid).order('exam_date', { ascending: false }).limit(50),
      supabase.from('classes')
        .select('id, title, subject_id, subjects(id, name), class_enrollments(students(id, student_number, users(full_name)))')
        .eq('teacher_id', tid),
    ])

    const resultRows = (resultsRaw ?? []) as unknown as Result[]
    setResults(resultRows)

    const urls: Record<string, string> = {}
    await Promise.all(resultRows.filter(r => r.attachment_url).map(async r => {
      const { data } = await supabase.storage.from('exam-attachments').createSignedUrl(r.attachment_url!, 3600)
      if (data?.signedUrl) urls[r.id] = data.signedUrl
    }))
    setAttachmentUrls(urls)

    const classes = (classesRaw ?? []) as unknown as Array<{
      subjects: { id: string; name: string } | null
      class_enrollments: Array<{ students: { id: string; student_number: string; users: { full_name: string | null } | null } | null }>
    }>
    const studentOptions = new Map<string, string>()
    const subjectOptions = new Map<string, string>()
    for (const c of classes) {
      if (c.subjects) subjectOptions.set(c.subjects.id, c.subjects.name)
      for (const e of c.class_enrollments ?? []) {
        const s = e.students
        if (s) studentOptions.set(s.id, `${s.users?.full_name ?? 'Student'} (${s.student_number})`)
      }
    }
    setStudents([...studentOptions.entries()].map(([id, label]) => ({ id, label })))
    setSubjects([...subjectOptions.entries()].map(([id, label]) => ({ id, label })))
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleAttach() {
    const { path, error: uploadErr } = await pickAndUpload('exam-attachments', `${institutionId}/exam-results`)
    if (uploadErr) { setError(uploadErr); return }
    if (path) setAttachedFile(path)
  }

  async function handleCreate() {
    setSubmitting(true)
    setError('')
    const { error } = await supabase.from('exam_results').insert({
      teacher_id: teacherId, student_id: studentId, subject_id: subjectId, assessment_name: assessmentName,
      exam_date: examDate || null, score: Number(score), max_score: Number(maxScore), grade: grade || null,
      attachment_url: attachedFile, is_published: false,
    } as unknown as never)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    setStudentId(''); setSubjectId(''); setAssessmentName(''); setExamDate(''); setScore(''); setGrade(''); setAttachedFile(null); setOpen(false)
    await load()
  }

  async function togglePublish(r: Result) {
    await supabase.from('exam_results').update({ is_published: !r.is_published } as unknown as never).eq('id', r.id)
    await load()
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Grades" />

      {students.length === 0 ? (
        <EmptyState text="No students enrolled in your classes yet." />
      ) : !open ? (
        <PrimaryButton label="+ Add Result" onPress={() => setOpen(true)} />
      ) : (
        <Card>
          <Text style={styles.cardTitle}>Add Result</Text>
          <Text style={styles.label}>Student</Text>
          <View style={styles.chipRow}>
            {students.map(s => (
              <Text key={s.id} onPress={() => setStudentId(s.id)} style={[chipStyles.chip, studentId === s.id ? chipStyles.chipActive : null]}>{s.label}</Text>
            ))}
          </View>
          <Text style={styles.label}>Subject</Text>
          <View style={styles.chipRow}>
            {subjects.map(s => (
              <Text key={s.id} onPress={() => setSubjectId(s.id)} style={[chipStyles.chip, subjectId === s.id ? chipStyles.chipActive : null]}>{s.label}</Text>
            ))}
          </View>
          <TextField value={assessmentName} onChangeText={setAssessmentName} placeholder="Assessment name" />
          <TextField value={examDate} onChangeText={setExamDate} placeholder="Exam date (YYYY-MM-DD, optional)" />
          <TextField value={score} onChangeText={setScore} placeholder="Score" keyboardType="numeric" />
          <TextField value={maxScore} onChangeText={setMaxScore} placeholder="Max score" keyboardType="numeric" />
          <TextField value={grade} onChangeText={setGrade} placeholder="Grade (A/B/C/D/F, optional)" />
          <Text onPress={handleAttach} style={styles.attachLink}>
            {attachedFile ? 'Attachment added ✓ (tap to replace)' : '📎 Attach file (optional)'}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Add Result (Draft)" onPress={handleCreate} loading={submitting} disabled={!studentId || !subjectId || !assessmentName || !score} />
          <Text onPress={() => setOpen(false)} style={styles.cancelLink}>Cancel</Text>
        </Card>
      )}

      <Text style={styles.sectionLabel}>Results ({results.length})</Text>
      {results.length === 0 ? (
        <EmptyState text="No results recorded yet." />
      ) : (
        <Card>
          {results.map(r => (
            <ListRow key={r.id}
              title={`${r.students?.users?.full_name ?? r.students?.student_number ?? '—'} · ${r.subjects?.name ?? '—'}`}
              subtitle={`${r.assessment_name}${r.assessment_type ? ` (${r.assessment_type})` : ''} · ${r.score}/${r.max_score}${attachmentUrls[r.id] ? ' · 📎 attached (tap to publish)' : ''}`}
              right={<Badge label={r.is_published ? 'PUBLISHED' : 'DRAFT'} status={r.is_published ? 'published' : 'draft'} />}
              onPress={() => togglePublish(r)}
            />
          ))}
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
  label: { fontSize: 12, color: colors.gray, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  error: { color: colors.red, fontSize: 12, marginBottom: 8 },
  attachLink: { fontSize: 13, color: colors.blue, marginBottom: 10 },
  cancelLink: { textAlign: 'center', color: colors.gray, fontSize: 13, marginTop: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
