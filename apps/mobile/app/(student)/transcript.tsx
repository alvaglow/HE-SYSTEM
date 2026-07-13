/**
 * Mirrors apps/web/app/student/transcript. Mobile has no print dialog, so
 * this uses React Native's built-in Share API (no extra dependency) to let
 * the student share/save a plain-text version of their transcript instead.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, Share } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { calculateCgpa } from '@he-system/shared/utils/gpa-calculator'
import { colors, ScreenHeader, Card, PrimaryButton, LoadingView } from '../../components/ui'

type SubjectRow = { subjectId: string; subjectName: string; subjectCode?: string; creditHours: number; grade: string | null; gradePoint: number | null }

export default function TranscriptScreen() {
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [programme, setProgramme] = useState('')
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [totalCreditHours, setTotalCreditHours] = useState(0)
  const [cgpa, setCgpa] = useState<number | null>(null)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setName(me.fullName ?? '')

    const { data: studentRaw } = await supabase.from('students').select('id, student_number, programmes(name)').eq('user_id', me.id).single()
    const student = studentRaw as unknown as { id: string; student_number: string | null; programmes: { name?: string } | null } | null
    setStudentNumber(student?.student_number ?? '')
    setProgramme(student?.programmes?.name ?? '')

    const { data: resultsRaw } = await supabase
      .from('exam_results').select('id, subject_id, grade, assessment_type, exam_date, subjects(name, code, credit_hours)')
      .eq('student_id', student?.id ?? '').eq('is_published', true)

    const rows = (resultsRaw ?? []) as unknown as Array<{
      id: string; subject_id: string; grade: string | null; assessment_type: string | null; exam_date: string | null
      subjects: { name: string; code: string | null; credit_hours: number | null } | null
    }>

    const result = calculateCgpa(rows.map(r => ({
      subjectId: r.subject_id, subjectName: r.subjects?.name ?? 'Subject', subjectCode: r.subjects?.code,
      creditHours: Number(r.subjects?.credit_hours ?? 0), grade: r.grade, assessmentType: r.assessment_type, examDate: r.exam_date,
    })))

    setSubjects(result.subjects)
    setTotalCreditHours(result.totalCreditHours)
    setCgpa(result.cgpa)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleShare() {
    const lines = [
      `Interim Transcript — ${name}`,
      `Student ID: ${studentNumber || '—'}`,
      `Programme: ${programme || '—'}`,
      '',
      ...subjects.map(s => `${s.subjectCode ?? ''} ${s.subjectName}: ${s.grade} (${s.creditHours} credit hrs)`),
      '',
      `Total Credit Hours: ${totalCreditHours}`,
      `CGPA: ${cgpa !== null ? cgpa : 'In progress'}`,
      '',
      'System-generated for personal reference only — not an official document.',
    ]
    await Share.share({ message: lines.join('\n') })
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Interim Transcript" />
      <Card>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.sub}>{studentNumber || '—'} · {programme || '—'}</Text>
      </Card>

      <Card>
        {subjects.length === 0 ? (
          <Text style={styles.empty}>No published final results yet.</Text>
        ) : (
          subjects.map(s => (
            <View key={s.subjectId} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subject}>{s.subjectName}</Text>
                <Text style={styles.sub}>{s.subjectCode ?? '—'} · {s.creditHours} credit hrs</Text>
              </View>
              <Text style={styles.grade}>{s.grade}</Text>
            </View>
          ))
        )}
        <View style={styles.totalsRow}>
          <Text style={styles.sub}>Total Credit Hours: {totalCreditHours}</Text>
          <Text style={styles.cgpa}>CGPA: {cgpa !== null ? cgpa : 'In progress'}</Text>
        </View>
      </Card>

      <PrimaryButton label="Share Transcript" onPress={handleShare} />
      <Text style={styles.disclaimer}>System-generated for personal reference only — not an official document.</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  name: { fontSize: 16, fontWeight: '700', color: colors.blue },
  sub: { fontSize: 12, color: colors.gray, marginTop: 2 },
  empty: { fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  subject: { fontSize: 14, fontWeight: '600', color: colors.text },
  grade: { fontSize: 14, fontWeight: '700', color: colors.blue },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 4 },
  cgpa: { fontSize: 16, fontWeight: '700', color: colors.blue },
  disclaimer: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 8, marginBottom: 16 },
})
