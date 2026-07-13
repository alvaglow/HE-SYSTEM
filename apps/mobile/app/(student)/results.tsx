/**
 * Mirrors apps/web/app/student/results (StudentResultsPage).
 */
import { useCallback, useState } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, StatCard, ListRow, Badge, EmptyState, LoadingView } from '../../components/ui'
import { calculateCgpa } from '@he-system/shared/utils/gpa-calculator'

type ExamResult = {
  id: string; score: number; max_score: number; grade: string | null
  assessment_name: string; assessment_type: string | null; exam_date: string | null; subject_id: string
  subjects: { name: string; code: string | null; credit_hours: number | null } | null
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
      .select('id, score, max_score, grade, assessment_name, assessment_type, exam_date, subject_id, subjects(name, code, credit_hours)')
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

  const cgpaResult = calculateCgpa(results.map(r => ({
    subjectId: r.subject_id,
    subjectName: r.subjects?.name ?? 'Subject',
    subjectCode: r.subjects?.code,
    creditHours: Number(r.subjects?.credit_hours ?? 0),
    grade: r.grade,
    assessmentType: r.assessment_type,
    examDate: r.exam_date,
  })))

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Exam Results" />

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <StatCard label="CGPA" value={cgpaResult.cgpa ?? '—'} accent={colors.purple} />
        <StatCard label="Average Score" value={`${avgPct}%`} accent={colors.blue} />
        <StatCard label="Published" value={results.length} accent={colors.gray} />
      </View>

      {cgpaResult.subjects.length > 0 && (
        <Card>
          {cgpaResult.subjects.map(s => (
            <ListRow key={s.subjectId}
              title={`${s.subjectNam