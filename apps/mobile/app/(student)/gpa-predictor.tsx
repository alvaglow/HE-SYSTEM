/**
 * Mirrors apps/web/app/student/gpa-predictor (Predictor). Simulation only —
 * nothing here is saved. Uses the shared calculateCgpa util.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, StatCard, LoadingView, PrimaryButton, TextField } from '../../components/ui'
import { calculateCgpa, GRADE_OPTIONS } from '@he-system/shared/utils/gpa-calculator'

type CompletedSubject = { subjectId: string; subjectName: string; subjectCode?: string | null; creditHours: number; grade: string }
type HypRow = { id: string; name: string; creditHours: string; grade: string }

let rowCounter = 0
function newRow(): HypRow {
  rowCounter += 1
  return { id: `hyp-${Date.now()}-${rowCounter}`, name: '', creditHours: '3', grade: 'A' }
}

export default function GpaPredictorScreen() {
  const [completed, setCompleted] = useState<CompletedSubject[]>([])
  const [currentCgpa, setCurrentCgpa] = useState<number | null>(null)
  const [totalCredits, setTotalCredits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<HypRow[]>([newRow()])

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', me.id).single()
    const studentId = (studentRaw as unknown as { id: string } | null)?.id ?? ''

    const { data: resultsRaw } = await supabase
      .from('exam_results')
      .select('id, grade, assessment_type, exam_date, subject_id, subjects(name, code, credit_hours)')
      .eq('student_id', studentId)
      .eq('is_published', true)

    const results = (resultsRaw ?? []) as unknown as Array<{
      id: string; grade: string | null; assessment_type: string | null; exam_date: string | null
      subject_id: string; subjects: { name: string; code: string | null; credit_hours: number | null } | null
    }>

    const cgpaResult = calculateCgpa(results.map(r => ({
      subjectId: r.subject_id,
      subjectName: r.subjects?.name ?? 'Subject',
      subjectCode: r.subjects?.code,
      creditHours: Number(r.subjects?.credit_hours ?? 0),
      grade: r.grade,
      assessmentType: r.assessment_type,
      examDate: r.exam_date,
    })))

    setCompleted(cgpaResult.subjects.map(s => ({ subjectId: s.subjectId, subjectName: s.subjectName, subjectCode: s.subjectCode, creditHours: s.creditHours, grade: s.grade })))
    setCurrentCgpa(cgpaResult.cgpa)
    setTotalCredits(cgpaResult.totalCreditHours)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  const inputs = [
    ...completed.map(c => ({ subjectId: c.subjectId, subjectName: c.subjectName, subjectCode: c.subjectCode, creditHours: c.creditHours, grade: c.grade, assessmentType: 'final', examDate: '2000-01-01' })),
    ...rows.filter(r => r.name.trim() && Number(r.creditHours) > 0).map(r => ({ subjectId: r.id, subjectName: r.name.trim(), creditHours: Number(r.creditHours), grade: r.grade, assessmentType: 'final', examDate: '9999-01-01' })),
  ]
  const projected = calculateCgpa(inputs)

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="GPA Predictor" subtitle="Simulation only — nothing here is saved" />

      <View style={styles.statsRow}>
        <StatCard label="Current CGPA" value={currentCgpa ?? '—'} accent={colors.purple} />
        <StatCard label="Projected CGPA" value={projected.cgpa ?? '—'} accent={colors.blue} />
      </View>
      <Text style={styles.meta}>{totalCredits} credits completed · {projected.totalCreditHours} incl. hypothetical</Text>

      <Text style={styles.sectionTitle}>Hypothetical Courses</Text>
      {rows.map(row => (
        <Card key={row.id}>
          <TextField value={row.name} onChangeText={v => setRows(rs => rs.map(r => r.id === row.id ? { ...r, name: v } : r))} placeholder="Course name" />
          <View style={{ height: 8 }} />
          <TextField value={row.creditHours} onChangeText={v => setRows(rs => rs.map(r => r.id === row.id ? { ...r, creditHours: v } : r))} placeholder="Credit hours" keyboardType="numeric" />
          <View style={styles.chipRow}>
            {GRADE_OPTIONS.map(g => (
              <Text key={g} onPress={() => setRows(rs => rs.map(r => r.id === row.id ? { ...r, grade: g } : r))} style={[styles.chip, row.grade === g && styles.chipActive]}>
                {g}
              </Text>
            ))}
          </View>
          <Text onPress={() => setRows(rs => rs.filter(r => r.id !== row.id))} style={styles.removeLink}>Remove</Text>
        </Card>
      ))}
      <PrimaryButton label="+ Add Course" onPress={() => setRows(rs => [...rs, newRow()])} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  meta: { fontSize: 11, color: colors.gray, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.grayLight, fontSize: 12, color: colors.gray, overflow: 'hidden' },
  chipActive: { backgroundColor: colors.purple, color: '#fff', fontWeight: '700' },
  removeLink: { color: colors.red, fontSize: 12, fontWeight: '700', marginTop: 8 },
})
