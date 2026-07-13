/**
 * Mirrors apps/web/app/parent/transcript (ParentTranscriptPage), condensed
 * to CGPA + subject list per child (no print layout on mobile).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { calculateCgpa } from '@he-system/shared/utils/gpa-calculator'
import { colors, ScreenHeader, Card, EmptyState, LoadingView } from '../../components/ui'

type ChildTranscript = {
  id: string; name: string; studentNumber: string | null; programme: string
  cgpa: number | null; totalCreditHours: number
  subjects: Array<{ subjectId: string; subjectName: string; subjectCode?: string; creditHours: number; grade: string | null }>
}

export default function ParentTranscriptScreen() {
  const [blocks, setBlocks] = useState<ChildTranscript[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: linksRaw } = await supabase
      .from('parent_student_links')
      .select('students(id, student_number, users(full_name), programmes(name))')
      .eq('parent_user_id', me.id)
    const links = (linksRaw ?? []) as unknown as Array<{
      students: { id: string; student_number: string | null; users: { full_name: string | null } | null; programmes: { name?: string } | null } | null
    }>
    const children = links.map(l => l.students).filter((s): s is NonNullable<typeof s> => !!s)

    const results = await Promise.all(children.map(async child => {
      const { data: resultsRaw } = await supabase
        .from('exam_results')
        .select('id, subject_id, grade, assessment_type, exam_date, subjects(name, code, credit_hours)')
        .eq('student_id', child.id).eq('is_published', true)
      const rows = (resultsRaw ?? []) as unknown as Array<{
        id: string; subject_id: string; grade: string | null; assessment_type: string | null; exam_date: string | null
        subjects: { name: string; code: string | null; credit_hours: number | null } | null
      }>
      const cgpaResult = calculateCgpa(rows.map(r => ({
        subjectId: r.subject_id, subjectName: r.subjects?.name ?? 'Subject', subjectCode: r.subjects?.code,
        creditHours: Number(r.subjects?.credit_hours ?? 0), grade: r.grade, assessmentType: r.assessment_type, examDate: r.exam_date,
      })))
      return {
        id: child.id, name: child.users?.full_name ?? 'Child', studentNumber: child.student_number,
        programme: child.programmes?.name ?? '—', cgpa: cgpaResult.cgpa, totalCreditHours: cgpaResult.totalCreditHours,
        subjects: cgpaResult.subjects,
      }
    }))
    setBlocks(results)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Transcript" />
      {blocks.length === 0 ? (
        <EmptyState text="No children linked to your account yet. Contact admin." />
      ) : (
        blocks.map(b => (
          <Card key={b.id}>
            <Text style={styles.childHeader}>{b.name}</Text>
            <Text style={styles.meta}>{b.programme} · {b.studentNumber ?? '—'}</Text>
            {b.subjects.length === 0 ? (
              <EmptyState text="No published final results yet." />
            ) : (
              b.subjects.map(s => (
                <View key={s.subjectId} style={styles.row}>
                  <Text style={styles.subject}>{s.subjectName}</Text>
                  <Text style={styles.grade}>{s.grade}</Text>
                </View>
              ))
            )}
            <View style={styles.footer}>
              <Text style={styles.meta}>Total Credit Hours: {b.totalCreditHours}</Text>
              <Text style={styles.cgpa}>CGPA: {b.cgpa !== null ? b.cgpa : 'In progress'}</Text>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  childHeader: { fontSize: 15, fontWeight: '700', color: colors.blue },
  meta: { fontSize: 12, color: colors.gray, marginTop: 2, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  subject: { fontSize: 13, color: colors.text },
  grade: { fontSize: 13, fontWeight: '700', color: colors.text },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.grayLight },
  cgpa: { fontSize: 15, fontWeight: '700', color: colors.blue },
})
