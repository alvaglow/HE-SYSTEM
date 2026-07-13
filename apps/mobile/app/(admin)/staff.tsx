/**
 * Mirrors apps/web/app/admin/staff (AdminStaffPage + AddStaffForm).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { adminCreateUser } from '../../lib/edgeFunctions'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Teacher = { id: string; employee_number: string; is_active: boolean | null; users: { full_name: string | null; email: string } | null }
type Staff = { id: string; employee_number: string; position: string | null; is_active: boolean | null; users: { full_name: string | null; email: string } | null }

const ROLES = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'staff', label: 'Support Staff' },
  { value: 'management', label: 'Management' },
  { value: 'admin', label: 'Admin' },
] as const

export default function StaffScreen() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<typeof ROLES[number]['value']>('teacher')
  const [position, setPosition] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const [{ data: teachersRaw }, { data: staffRaw }] = await Promise.all([
      supabase.from('teachers').select('id, employee_number, is_active, users(full_name, email)').eq('institution_id', me.institutionId),
      supabase.from('staff').select('id, employee_number, position, is_active, users(full_name, email)').eq('institution_id', me.institutionId),
    ])
    setTeachers((teachersRaw ?? []) as unknown as Teacher[])
    setStaff((staffRaw ?? []) as unknown as Staff[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleCreate() {
    setSubmitting(true)
    setError('')
    try {
      const res = await adminCreateUser({ fullName, email, password, role, position: position || undefined })
      if (res?.error) { setError(res.error); return }
      setFullName(''); setEmail(''); setPassword(''); setPosition(''); setOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create account')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Staff" />

      {!open ? (
        <PrimaryButton label="+ Add Staff / Teacher" onPress={() => setOpen(true)} />
      ) : (
        <Card>
          <Text style={styles.cardTitle}>Add Staff or Teacher</Text>
          <TextField value={fullName} onChangeText={setFullName} placeholder="Full name" />
          <TextField value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" />
          <TextField value={password} onChangeText={setPassword} placeholder="Temporary password (min 8 chars)" secureTextEntry />
          <Text style={styles.label}>Role</Text>
          <View style={styles.chipRow}>
            {ROLES.map(r => (
              <Text key={r.value} onPress={() => setRole(r.value)} style={[chipStyles.chip, role === r.value ? chipStyles.chipActive : null]}>{r.label}</Text>
            ))}
          </View>
          {role !== 'teacher' && (
            <TextField value={position} onChangeText={setPosition} placeholder="Position (e.g. Front Desk, Registrar)" />
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Create Account" onPress={handleCreate} loading={submitting} disabled={!fullName || !email || password.length < 8} />
          <Text onPress={() => setOpen(false)} style={styles.cancelLink}>Cancel</Text>
        </Card>
      )}

      <Text style={styles.sectionLabel}>Teachers ({teachers.length})</Text>
      {teachers.length === 0 ? (
        <EmptyState text="No teachers yet." />
      ) : (
        <Card>
          {teachers.map(t => (
            <ListRow key={t.id} title={t.users?.full_name ?? '—'} subtitle={t.employee_number}
              right={<Badge label={t.is_active ? 'Active' : 'Inactive'} status={t.is_active ? 'active' : 'inactive'} />} />
          ))}
        </Card>
      )}

      <Text style={styles.sectionLabel}>Admin & Support Staff ({staff.length})</Text>
      {staff.length === 0 ? (
        <EmptyState text="No staff yet." />
      ) : (
        <Card>
          {staff.map(s => (
            <ListRow key={s.id} title={s.users?.full_name ?? '—'} subtitle={s.position ?? s.employee_number}
              right={<Badge label={s.is_active ? 'Active' : 'Inactive'} status={s.is_active ? 'active' : 'inactive'} />} />
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
  cancelLink: { textAlign: 'center', color: colors.gray, fontSize: 13, marginTop: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
