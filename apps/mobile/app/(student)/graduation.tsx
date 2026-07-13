/**
 * Mirrors apps/web/app/student/graduation (degree audit + apply).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, StatCard, LoadingView, PrimaryButton } from '../../components/ui'
import { calculateCgpa } from '@he-system/shared/utils/gpa-calculator'

type Student = { id: string; institution_id: string; programme_id: string | null; programmes: { id: string; name: string; required_credit_hours: number | null } | null }
type Application = { id: string; status: string; total_credit_hours_completed: number; cgpa_at_application: number | null; applied_at: string; review_notes: string | null }

const STATUS_COLOR: Record<string, string> = { pending: colors.amber, approved: colors.green, rejected: colors.red }

export default function GraduationScreen() {
  const [student, setStudent] = useState<Student | null>(null)
  const [cgpa, setCgpa] = useState<number | null>(null)
  const [totalCredits, setTotalCredits] = useState(0)
  const [existing, setExisting] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: studentRaw } = await supabase.from('students').select('id, institution_id, programme_id, programmes(id, name, required_credit_hours)').eq('user_id', me.id).single()
    const s = studentRaw as unknown as Student | null
    setStudent(s)
    if (!s) { setLoading(false); return }

    const [{ data: resultsRaw }, { data: existingRaw }] = await Promise.all([
      supabase.from('exam_results').select('id, grade, assessment_type, exam_date, subject_id, subjects(name, code, credit_hours)').eq('student_id', s.id).eq('is_published', true),
      s.programme_id
        ? supabase.from('graduation_applications').select('id, status, total_credit_hours_completed, cgpa_at_application, applied_at, review_notes').eq('student_id', s.id).eq('programme_id', s.programme_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const results = (resultsRaw ?? []) as unknown as Array<{
      id: string; grade: string | null; assessment_type: string | null; exam_date: string | null
      subject_id: string; subjects: { name: string; code: string | null; credit_hours: number | null } | null
    }>
    const cgpaResult = calculateCgpa(results.map(r => ({
      subjectId: r.subject_id, subjectName: r.subjects?.name ?? 'Subject', subjectCode: r.subjects?.code,
      creditHours: Number(r.subjects?.credit_hours ?? 0), grade: r.grade, assessmentType: r.assessment_type, examDate: r.exam_date,
    })))
    setCgpa(cgpaResult.cgpa)
    setTotalCredits(cgpaResult.totalCreditHours)
    setExisting((existingRaw ?? null) as unknown as Application | null)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function apply() {
    if (!student || !student.programme_id) return
    setApplying(true)
    await supabase.from('graduation_applications').insert({
      institution_id: student.institution_id, student_id: student.id, programme_id: student.programme_id,
      total_credit_hours_completed: totalCredits, cgpa_at_application: cgpa,
    } as unknown as never)
    setApplying(false)
    await load()
  }

  if (loading) return <LoadingView />

  if (!student || !student.programme_id) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <ScreenHeader title="Graduation" />
        <Card><Text style={styles.empty}>No programme assigned to your record yet. Contact admin.</Text></Card>
      </ScrollView>
    )
  }

  const required = student.programmes?.required_credit_hours ?? null
  const eligible = required == null || totalCredits >= required

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Graduation" subtitle={student.programmes?.name} />

      <View style={styles.statsRow}>
        <StatCard label="CGPA" value={cgpa ?? '—'} accent={colors.purple} />
        <StatCard label="Credits" value={`${totalCredits} / ${required ?? '—'}`} accent={colors.blue} />
      </View>

      <Card>
        {required == null ? (
          <Text style={styles.warn}>Your programme doesn't have a required credit hour total configured yet — contact admin.</Text>
        ) : eligible ? (
          <Text style={styles.ok}>You meet the minimum credit hour requirement for this programme.</Text>
        ) : (
          <Text style={styles.warn}>You need {(required - totalCredits).toFixed(1)} more credit hours before you're eligible to apply.</Text>
        )}

        {existing ? (
          <View style={styles.statusBox}>
            <Text style={[styles.badge, { backgroundColor: STATUS_COLOR[existing.status] + '22', color: STATUS_COLOR[existing.status] }]}>
              {existing.status.toUpperCase()}
            </Text>
            <Text style={styles.meta}>Applied {new Date(existing.applied_at).toLocaleDateString()}</Text>
            <Text style={styles.meta}>CGPA at application: {existing.cgpa_at_application ?? '—'} · Credits: {existing.total_credit_hours_completed}</Text>
            {existing.review_notes ? <Text style={styles.meta}>Reviewer notes: {existing.review_notes}</Text> : null}
          </View>
        ) : eligible && required != null ? (
          <View style={{ marginTop: 12 }}>
            <PrimaryButton label="Apply to Graduate" onPress={apply} loading={applying} />
          </View>
        ) : null}
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  empty: { fontSize: 13, color: colors.gray },
  ok: { fontSize: 13, color: colors.green, marginBottom: 8 },
  warn: { fontSize: 13, color: colors.amber, marginBottom: 8 },
  statusBox: { marginTop: 8 },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden', alignSelf: 'flex-start', marginBottom: 6 },
  meta: { fontSize: 12, color: colors.gray, marginTop: 2 },
})
