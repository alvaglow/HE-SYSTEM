/**
 * Mirrors apps/web/app/admin/financial-aid (FinancialAidManager).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Record_ = {
  id: string; aid_type: string; provider: string; amount: number | null; currency: string; status: string
  students: { users: { full_name: string | null } | null } | null
}
type StudentOption = { id: string; label: string }

const AID_TYPES = ['scholarship', 'loan', 'grant', 'bursary']
const STATUSES = ['applied', 'approved', 'disbursed', 'rejected']

export default function FinancialAidManagerScreen() {
  const [institutionId, setInstitutionId] = useState('')
  const [records, setRecords] = useState<Record_[]>([])
  const [students, setStudents] = useState<StudentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [aidType, setAidType] = useState('scholarship')
  const [provider, setProvider] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)
    const [{ data: recordsRaw }, { data: studentsRaw }] = await Promise.all([
      supabase.from('financial_aid_records').select('id, aid_type, provider, amount, currency, status, students(users(full_name))').eq('institution_id', me.institutionId).order('created_at', { ascending: false }),
      supabase.from('students').select('id, users(full_name)').eq('institution_id', me.institutionId).eq('is_active', true),
    ])
    setRecords((recordsRaw ?? []) as unknown as Record_[])
    setStudents(((studentsRaw ?? []) as unknown as Array<{ id: string; users: { full_name: string | null } | null }>).map(s => ({ id: s.id, label: s.users?.full_name ?? 'Unnamed student' })))
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleCreate() {
    setSubmitting(true)
    setError('')
    const { error } = await supabase.from('financial_aid_records').insert({
      institution_id: institutionId, student_id: studentId, aid_type: aidType, provider,
      amount: amount ? Number(amount) : null, currency: 'USD', status: 'applied',
    } as unknown as never)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    setStudentId(''); setAidType('scholarship'); setProvider(''); setAmount(''); setOpen(false)
    await load()
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('financial_aid_records').update({ status } as unknown as never).eq('id', id)
    await load()
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Financial Aid" />
      {!open ? (
        <PrimaryButton label="+ Add Record" onPress={() => setOpen(true)} />
      ) : (
        <Card>
          <Text style={styles.cardTitle}>New Financial Aid Record</Text>
          <Text style={styles.label}>Student</Text>
          <View style={styles.chipRow}>
            {students.map(s => (
              <Text key={s.id} onPress={() => setStudentId(s.id)} style={[chipStyles.chip, studentId === s.id ? chipStyles.chipActive : null]}>{s.label}</Text>
            ))}
          </View>
          <Text style={styles.label}>Type</Text>
          <View style={styles.chipRow}>
            {AID_TYPES.map(t => (
              <Text key={t} onPress={() => setAidType(t)} style={[chipStyles.chip, aidType === t ? chipStyles.chipActive : null]}>{t}</Text>
            ))}
          </View>
          <TextField value={provider} onChangeText={setProvider} placeholder="Provider" />
          <TextField value={amount} onChangeText={setAmount} placeholder="Amount (optional)" keyboardType="numeric" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Add Record" onPress={handleCreate} loading={submitting} disabled={!studentId || !provider} />
          <Text onPress={() => setOpen(false)} style={styles.cancelLink}>Cancel</Text>
        </Card>
      )}

      <Text style={styles.sectionLabel}>All Records ({records.length})</Text>
      {records.length === 0 ? (
        <EmptyState text="No financial aid records yet." />
      ) : (
        records.map(r => (
          <Card key={r.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recTitle}>{r.students?.users?.full_name ?? '—'}</Text>
                <Text style={styles.recSub}>{r.aid_type} · {r.provider}</Text>
                {r.amount && <Text style={styles.recSub}>{Number(r.amount).toLocaleString()} {r.currency}</Text>}
              </View>
              <Badge label={r.status} status={r.status === 'disbursed' || r.status === 'approved' ? 'approved' : r.status === 'rejected' ? 'rejected' : 'pending'} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {STATUSES.map(s => (
                <Text key={s} onPress={() => updateStatus(r.id, s)} style={[chipStyles.chip, r.status === s ? chipStyles.chipActive : null]}>{s}</Text>
              ))}
            </View>
          </Card>
        ))
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
  recTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  recSub: { fontSize: 12, color: colors.gray, marginTop: 2 },
})
