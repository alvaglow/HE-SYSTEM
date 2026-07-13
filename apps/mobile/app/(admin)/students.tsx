/**
 * Mirrors apps/web/app/admin/students (AdminStudentsPage + AddStudentForm).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { adminCreateUser } from '../../lib/edgeFunctions'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Programme = { id: string; name: string }
type Student = {
  id: string; student_number: string; is_active: boolean | null; created_at: string
  users: { full_name: string | null; email: string } | null
  programmes: { name: string } | null
}

export default function StudentsScreen() {
  const [institutionId, setInstitutionId] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [programmeId, setProgrammeId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)

    const [{ data: studentsRaw }, { data: programmesRaw }] = await Promise.all([
      supabase.from('students')
        .select('id, student_number, is_active, created_at, users(full_name, email), programmes(name)')
        .eq('institution_id', me.institutionId)
        .order('created_at', { ascending: false }),
      supabase.from('programmes').select('id, name').eq('institution_id', me.institutionId).eq('is_active', true),
    ])

    setStudents((studentsRaw ?? []) as unknown as Student[])
    setProgrammes((programmesRaw ?? []) as unknown as Programme[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleCreate() {
    setSubmitting(true)
    setError('')
    try {
      const res = await adminCreateUser({ fullName, email, password, role: 'student', programmeId: programmeId || undefined })
      if (res?.error) { setError(res.error); return }
      setFullName(''); setEmail(''); setPassword(''); setProgrammeId(''); setOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create student')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Students" />

      {!open ? (
        <PrimaryButton label="+ Add Student" onPress={() => setOpen(true)} />
      ) : (
        <Card>
          <Text style={styles.cardTitle}>Add Student</Text>
          <TextField value={fullName} onChangeText={setFullName} placeholder="Full name" />
          <TextField value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" />
          <TextField value={password} onChangeText={setPassword} placeholder="Temporary password (min 8 chars)" secureTextEntry />
          <Text style={styles.label}>Programme (optional)</Text>
          <View style={styles.chipRow}>
            <ChipOption label="— None —" active={programmeId === ''} onPress={() => setProgrammeId('')} />
            {programmes.map(p => (
              <ChipOption key={p.id} label={p.name} active={programmeId === p.id} onPress={() => setProgrammeId(p.id)} />
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton label="Create Student" onPress={handleCreate} loading={submitting} disabled={!fullName || !email || password.length < 8} />
            </View>
          </View>
          <Text onPress={() => setOpen(false)} style={styles.cancelLink}>Cancel</Text>
        </Card>
      )}

      <Text style={styles.sectionLabel}>All Students ({students.length})</Text>
      {students.length === 0 ? (
        <EmptyState text="No students yet. Add the first one above." />
      ) : (
        <Card>
          {students.map(s => (
            <ListRow
              key={s.id}
              title={s.users?.full_name ?? s.student_number}
              subtitle={`${s.users?.email ?? '—'} · ${s.programmes?.name ?? 'No programme'}`}
              right={<Badge label={s.is_active ? 'Active' : 'Inactive'} status={s.is_active ? 'active' : 'inactive'} />}
            />
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

function ChipOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Text onPress={onPress} style={[chipStyles.chip, active ? chipStyles.chipActive : null]}>{label}</Text>
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
  cancelLink: { textAlign: 'center', color: colors.gray, fontSize: 13, marginTop: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
