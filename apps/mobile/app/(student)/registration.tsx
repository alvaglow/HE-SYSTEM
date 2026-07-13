/**
 * Mirrors apps/web/app/student/registration (StudentRegistrationPage + RegistrationList).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, EmptyState, LoadingView } from '../../components/ui'

type ClassRow = {
  id: string; title: string | null; starts_at: string; capacity: number | null
  subjects: { name: string } | null; teachers: { users: { full_name: string | null } | null } | null
}
type EnrollmentRow = { id: string; class_id: string; is_active: boolean }

export default function StudentRegistrationScreen() {
  const [studentId, setStudentId] = useState('')
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', me.id).single()
    const sid = (studentRaw as unknown as { id: string } | null)?.id ?? ''
    setStudentId(sid)

    const [{ data: classesRaw }, { data: enrollmentsRaw }] = await Promise.all([
      supabase.from('classes').select('id, title, starts_at, capacity, subjects(name), teachers(users(full_name))')
        .eq('institution_id', me.institutionId).eq('is_cancelled', false).order('starts_at', { ascending: true }).limit(100),
      supabase.from('class_enrollments').select('id, class_id, is_active').eq('student_id', sid),
    ])
    setClasses((classesRaw ?? []) as unknown as ClassRow[])
    setEnrollments((enrollmentsRaw ?? []) as unknown as EnrollmentRow[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleEnroll(classId: string, existing: EnrollmentRow | undefined) {
    setBusyId(classId)
    setError('')
    const { error } = existing
      ? await supabase.from('class_enrollments').update({ is_active: true } as unknown as never).eq('id', existing.id)
      : await supabase.from('class_enrollments').insert({ class_id: classId, student_id: studentId, is_active: true } as unknown as never)
    setBusyId(null)
    if (error) { setError(error.message); return }
    await load()
  }

  async function handleDrop(existing: EnrollmentRow | undefined) {
    if (!existing) return
    setBusyId(existing.class_id)
    const { error } = await supabase.from('class_enrollments').update({ is_active: false } as unknown as never).eq('id', existing.id)
    setBusyId(null)
    if (error) { setError(error.message); return }
    await load()
  }

  if (loading) return <LoadingView />

  const byClass = new Map(enrollments.map(e => [e.class_id, e]))
  const activeCount = enrollments.filter(e => e.is_active).length

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Course Registration" />
      <Text style={styles.summary}>Currently enrolled in {activeCount} class{activeCount === 1 ? '' : 'es'}.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {classes.length === 0 ? (
        <EmptyState text="No classes open for registration right now." />
      ) : (
        <Card>
          {classes.map(c => {
            const enrollment = byClass.get(c.id)
            const active = enrollment?.is_active ?? false
            return (
              <View key={c.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.className}>{c.title || c.subjects?.name || 'Class'}</Text>
                  <Text style={styles.classMeta}>
                    {c.teachers?.users?.full_name ?? '—'} · {new Date(c.starts_at).toLocaleDateString()} · Capacity: {c.capacity ?? 'Unlimited'}
                  </Text>
                </View>
                {active ? (
                  <Text onPress={() => handleDrop(enrollment)} style={styles.dropLink}>{busyId === c.id ? 'Dropping…' : 'Drop'}</Text>
                ) : (
                  <Text onPress={() => handleEnroll(c.id, enrollment)} style={styles.enrollLink}>{busyId === c.id ? 'Enrolling…' : 'Enroll'}</Text>
                )}
              </View>
            )
          })}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  summary: { fontSize: 12, color: colors.gray, marginBottom: 12 },
  error: { fontSize: 12, color: colors.red, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  className: { fontSize: 13, fontWeight: '700', color: colors.text },
  classMeta: { fontSize: 11, color: colors.gray, marginTop: 2 },
  dropLink: { fontSize: 12, fontWeight: '700', color: colors.red, marginLeft: 10 },
  enrollLink: { fontSize: 12, fontWeight: '700', color: colors.blue, marginLeft: 10 },
})
