/**
 * Mirrors both apps/web/app/admin/enrolment (detail table + enrol form) and
 * apps/web/app/management/enrolment (aggregate summary) — merged into one
 * screen: everyone sees the "By Programme" summary cards, admin additionally
 * gets the enrol-a-student form and full class-enrolment table below.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, StatCard, ListRow, Badge, EmptyState, LoadingView, PrimaryButton } from '../../components/ui'

type Enrollment = {
  id: string; enrolled_at: string | null; is_active: boolean | null
  students: { users: { full_name: string | null } | null } | null
  classes: { title: string | null; subjects: { name: string; programmes: { name: string } | null } | null } | null
}
type Option = { id: string; label: string }

export default function EnrolmentScreen() {
  const [role, setRole] = useState('admin')
  const [institutionId, setInstitutionId] = useState('')
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [students, setStudents] = useState<Option[]>([])
  const [classes, setClasses] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [classId, setClassId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setRole(me.role)
    setInstitutionId(me.institutionId)

    const [{ data: enrollmentsRaw }, { data: studentsRaw }, { data: classesRaw }] = await Promise.all([
      supabase.from('class_enrollments')
        .select('id, enrolled_at, is_active, students(users(full_name)), classes(title, subjects(name, programmes(name)))')
        .order('enrolled_at', { ascending: false })
        .limit(200),
      supabase.from('students').select('id, users(full_name)').eq('institution_id', me.institutionId).eq('is_active', true),
      supabase.from('classes').select('id, title, starts_at, subjects(name)').eq('institution_id', me.institutionId).eq('is_cancelled', false).order('starts_at', { ascending: false }).limit(100),
    ])

    setEnrollments((enrollmentsRaw ?? []) as unknown as Enrollment[])
    setStudents(((studentsRaw ?? []) as unknown as Array<{ id: string; users: { full_name: string | null } | null }>)
      .map(s => ({ id: s.id, label: s.users?.full_name ?? 'Unnamed student' })))
    setClasses(((classesRaw ?? []) as unknown as Array<{ id: string; title: string | null; starts_at: string; subjects: { name: string } | null }>)
      .map(c => ({ id: c.id, label: `${c.title || c.subjects?.name || 'Class'} — ${new Date(c.starts_at).toLocaleDateString()}` })))
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleEnroll() {
    setSubmitting(true)
    setError('')
    const { error } = await supabase.from('class_enrollments').insert({
      student_id: studentId, class_id: classId, is_active: true,
    } as unknown as never)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    setStudentId(''); setClassId(''); setOpen(false)
    await load()
  }

  if (loading) return <LoadingView />

  const active = enrollments.filter(e => e.is_active)
  const byProgramme = new Map<string, number>()
  for (const e of active) {
    const label = e.classes?.subjects?.programmes?.name ?? e.classes?.subjects?.name ?? 'Unassigned'
    byProgramme.set(label, (byProgramme.get(label) ?? 0) + 1)
  }
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const newThisMonth = enrollments.filter(e => e.enrolled_at && new Date(e.enrolled_at) >= monthStart).length

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Enrolment" />

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <StatCard label="Active" value={active.length} accent={colors.blue} />
        <StatCard label="New This Month" value={newThisMonth} accent={colors.green} />
      </View>

      <Card>
        <Text style={styles.cardTitle}>By Programme</Text>
        {byProgramme.size === 0 ? (
          <EmptyState text="No active enrolments to break down yet." />
        ) : (
          [...byProgramme.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => (
            <ListRow key={label} title={label} right={<Text style={styles.count}>{count}</Text>} />
          ))
        )}
      </Card>

      {role !== 'management' && (
        <>
          {!open ? (
            <PrimaryButton label="+ Enrol Student" onPress={() => setOpen(true)} />
          ) : (
            <Card>
              <Text style={styles.cardTitle}>Enrol Student in Class</Text>
              <Text style={styles.label}>Student</Text>
              <View style={styles.chipRow}>
                {students.map(s => (
                  <Text key={s.id} onPress={() => setStudentId(s.id)} style={[chipStyles.chip, studentId === s.id ? chipStyles.chipActive : null]}>{s.label}</Text>
                ))}
              </View>
              <Text style={styles.label}>Class</Text>
              <View style={styles.chipRow}>
                {classes.map(c => (
                  <Text key={c.id} onPress={() => setClassId(c.id)} style={[chipStyles.chip, classId === c.id ? chipStyles.chipActive : null]}>{c.label}</Text>
                ))}
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton label="Enrol Student" onPress={handleEnroll} loading={submitting} disabled={!studentId || !classId} />
              <Text onPress={() => setOpen(false)} style={styles.cancelLink}>Cancel</Text>
            </Card>
          )}

          <Text style={styles.sectionLabel}>Class Enrolments ({enrollments.length})</Text>
          {enrollments.length === 0 ? (
            <EmptyState text="No enrolments yet." />
          ) : (
            <Card>
              {enrollments.slice(0, 30).map(e => (
                <ListRow
                  key={e.id}
                  title={e.students?.users?.full_name ?? '—'}
                  subtitle={`${e.classes?.title || e.classes?.subjects?.name || '—'} · ${e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : '—'}`}
                  right={<Badge label={e.is_active ? 'Active' : 'Inactive'} status={e.is_active ? 'active' : 'inactive'} />}
                />
              ))}
            </Card>
          )}
        </>
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
  count: { fontWeight: '700', color: colors.blue },
  error: { color: colors.red, fontSize: 12, marginBottom: 8 },
  cancelLink: { textAlign: 'center', color: colors.gray, fontSize: 13, marginTop: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
