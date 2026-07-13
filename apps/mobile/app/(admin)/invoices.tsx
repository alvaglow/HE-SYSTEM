/**
 * Mirrors apps/web/app/admin/invoices (AdminInvoicesPage + CreateInvoiceForm).
 * Admin-only screen (management has its own Finance overview instead).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { invoiceGenerate } from '../../lib/edgeFunctions'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Invoice = {
  id: string; invoice_number: string; amount: number; amount_paid: number | null
  currency: string | null; status: string | null; due_date: string | null; created_at: string
  students: { users: { full_name: string | null } | null } | null
}
type Option = { id: string; label: string }
type Programme = { id: string; name: string; fee_amount: number | null }

export default function InvoicesScreen() {
  const [institutionId, setInstitutionId] = useState('')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [students, setStudents] = useState<Option[]>([])
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [programmeId, setProgrammeId] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)

    const [{ data: invoicesRaw }, { data: studentsRaw }, { data: programmesRaw }] = await Promise.all([
      supabase.from('fee_invoices')
        .select('id, invoice_number, amount, amount_paid, currency, status, due_date, created_at, students(user_id, users(full_name))')
        .eq('institution_id', me.institutionId).order('created_at', { ascending: false }).limit(200),
      supabase.from('students').select('id, users(full_name)').eq('institution_id', me.institutionId).eq('is_active', true),
      supabase.from('programmes').select('id, name, fee_amount').eq('institution_id', me.institutionId).eq('is_active', true),
    ])

    setInvoices((invoicesRaw ?? []) as unknown as Invoice[])
    setStudents(((studentsRaw ?? []) as unknown as Array<{ id: string; users: { full_name: string | null } | null }>)
      .map(s => ({ id: s.id, label: s.users?.full_name ?? 'Unnamed student' })))
    setProgrammes((programmesRaw ?? []) as unknown as Programme[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function onProgrammeChange(id: string) {
    setProgrammeId(id)
    const prog = programmes.find(p => p.id === id)
    if (prog?.fee_amount != null) setAmount(String(prog.fee_amount))
  }

  async function handleCreate() {
    setSubmitting(true)
    setError('')
    try {
      const res = await invoiceGenerate({
        studentId, programmeId: programmeId || undefined, amount: parseFloat(amount), dueDate, description: description || undefined, institutionId,
      }) as { error?: string }
      if (res?.error) { setError(res.error); return }
      setStudentId(''); setProgrammeId(''); setAmount(''); setDueDate(''); setDescription(''); setOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create invoice')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Invoices" />

      {!open ? (
        <PrimaryButton label="+ Create Invoice" onPress={() => setOpen(true)} />
      ) : (
        <Card>
          <Text style={styles.cardTitle}>Create Invoice</Text>
          <Text style={styles.label}>Student</Text>
          <View style={styles.chipRow}>
            {students.map(s => (
              <Text key={s.id} onPress={() => setStudentId(s.id)} style={[chipStyles.chip, studentId === s.id ? chipStyles.chipActive : null]}>{s.label}</Text>
            ))}
          </View>
          <Text style={styles.label}>Programme (optional)</Text>
          <View style={styles.chipRow}>
            <Text onPress={() => onProgrammeChange('')} style={[chipStyles.chip, programmeId === '' ? chipStyles.chipActive : null]}>— None —</Text>
            {programmes.map(p => (
              <Text key={p.id} onPress={() => onProgrammeChange(p.id)} style={[chipStyles.chip, programmeId === p.id ? chipStyles.chipActive : null]}>{p.name}</Text>
            ))}
          </View>
          <TextField value={amount} onChangeText={setAmount} placeholder="Amount" keyboardType="decimal-pad" />
          <TextField value={dueDate} onChangeText={setDueDate} placeholder="Due date (YYYY-MM-DD)" />
          <TextField value={description} onChangeText={setDescription} placeholder="Description (optional)" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Create Invoice" onPress={handleCreate} loading={submitting} disabled={!studentId || !amount || !dueDate} />
          <Text onPress={() => setOpen(false)} style={styles.cancelLink}>Cancel</Text>
        </Card>
      )}

      <Text style={styles.sectionLabel}>All Invoices ({invoices.length})</Text>
      {invoices.length === 0 ? (
        <EmptyState text="No invoices yet. Create the first one above." />
      ) : (
        <Card>
          {invoices.map(inv => (
            <ListRow
              key={inv.id}
              title={`${inv.invoice_number} · ${inv.students?.users?.full_name ?? '—'}`}
              subtitle={`${Number(inv.amount).toLocaleString()} ${inv.currency ?? 'MYR'} · Paid ${Number(inv.amount_paid ?? 0).toLocaleString()} · Due ${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}`}
              right={<Badge label={(inv.status ?? 'draft').toUpperCase()} status={inv.status ?? 'draft'} />}
            />
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
