/**
 * Mirrors apps/web/app/management/finance (ManagementFinancePage).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, Linking } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { pickAndUpload } from '../../lib/uploadFile'
import { colors, ScreenHeader, Card, StatCard, ListRow, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${amount.toFixed(0)} ${currency}`
  }
}

type Budget = { id: string; period_year: number; allocated: number; spent: number | null; departments: { name: string } | null }
type Expense = {
  id: string; amount: number; currency: string; category: string | null; description: string
  status: string | null; expense_date: string | null; receipt_url: string | null; departments: { name: string } | null
}
type Department = { id: string; name: string }

export default function FinanceScreen() {
  const [institutionId, setInstitutionId] = useState('')
  const [userId, setUserId] = useState('')
  const [monthLabel, setMonthLabel] = useState('—')
  const [ytdLabel, setYtdLabel] = useState('—')
  const [outstandingLabel, setOutstandingLabel] = useState('—')
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({})
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const year = new Date().getFullYear()

  // New-expense form state
  const [open, setOpen] = useState(false)
  const [departmentId, setDepartmentId] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [attachedReceipt, setAttachedReceipt] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)
    setUserId(me.id)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()

    const [
      { data: paymentsMonthRaw }, { data: paymentsYtdRaw }, { data: outstandingRaw }, { data: budgetsRaw }, { data: expensesRaw }, { data: departmentsRaw },
    ] = await Promise.all([
      supabase.from('fee_payments').select('amount, invoice:fee_invoices(currency)').gte('paid_at', monthStart),
      supabase.from('fee_payments').select('amount, invoice:fee_invoices(currency)').gte('paid_at', yearStart),
      supabase.from('fee_invoices').select('amount, amount_paid, currency').eq('institution_id', me.institutionId).in('status', ['sent', 'overdue']),
      supabase.from('budgets').select('id, period_year, allocated, spent, departments(name)').eq('institution_id', me.institutionId).eq('period_year', now.getFullYear()),
      supabase.from('expenses').select('id, amount, currency, category, description, status, expense_date, receipt_url, departments(name)').eq('institution_id', me.institutionId).order('expense_date', { ascending: false }).limit(20),
      supabase.from('departments').select('id, name').eq('institution_id', me.institutionId).eq('is_active', true),
    ])
    setDepartments((departmentsRaw ?? []) as unknown as Department[])

    function sumByCurrency(rows: Array<{ amount: number; invoice: { currency?: string } | null }>) {
      const map = new Map<string, number>()
      for (const r of rows) {
        const cur = r.invoice?.currency ?? 'USD'
        map.set(cur, (map.get(cur) ?? 0) + Number(r.amount))
      }
      return map
    }
    const monthMap = sumByCurrency((paymentsMonthRaw ?? []) as unknown as Array<{ amount: number; invoice: { currency?: string } | null }>)
    const ytdMap = sumByCurrency((paymentsYtdRaw ?? []) as unknown as Array<{ amount: number; invoice: { currency?: string } | null }>)
    setMonthLabel(monthMap.size > 0 ? [...monthMap.entries()].map(([c, a]) => formatMoney(a, c)).join(' + ') : '—')
    setYtdLabel(ytdMap.size > 0 ? [...ytdMap.entries()].map(([c, a]) => formatMoney(a, c)).join(' + ') : '—')

    const outstanding = (outstandingRaw ?? []) as unknown as Array<{ amount: number; amount_paid: number | null; currency: string }>
    const outstandingByCurrency = new Map<string, number>()
    for (const inv of outstanding) {
      const remaining = Number(inv.amount) - Number(inv.amount_paid ?? 0)
      outstandingByCurrency.set(inv.currency, (outstandingByCurrency.get(inv.currency) ?? 0) + remaining)
    }
    setOutstandingLabel(outstandingByCurrency.size > 0 ? [...outstandingByCurrency.entries()].map(([c, a]) => formatMoney(a, c)).join(' + ') : '—')

    setBudgets((budgetsRaw ?? []) as unknown as Budget[])
    const expenseRows = (expensesRaw ?? []) as unknown as Expense[]
    setExpenses(expenseRows)

    const urls: Record<string, string> = {}
    await Promise.all(expenseRows.filter(e => e.receipt_url).map(async e => {
      const { data } = await supabase.storage.from('receipts').createSignedUrl(e.receipt_url!, 3600)
      if (data?.signedUrl) urls[e.id] = data.signedUrl
    }))
    setReceiptUrls(urls)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleAttachReceipt() {
    const { path, error: uploadErr } = await pickAndUpload('receipts', `${institutionId}/expenses`)
    if (uploadErr) { setError(uploadErr); return }
    if (path) setAttachedReceipt(path)
  }

  async function handleSubmitExpense() {
    setError('')
    const amt = Number(amount)
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return }
    if (!description) { setError('Enter a description.'); return }
    setSubmitting(true)
    const { error: insertErr } = await supabase.from('expenses').insert({
      institution_id: institutionId,
      department_id: departmentId || null,
      submitted_by: userId,
      amount: amt,
      currency: 'MYR',
      category: category || null,
      description,
      expense_date: expenseDate || null,
      receipt_url: attachedReceipt,
      status: 'pending',
    } as unknown as never)
    setSubmitting(false)
    if (insertErr) { setError(insertErr.message); return }
    setDepartmentId(''); setCategory(''); setDescription(''); setAmount(''); setExpenseDate(''); setAttachedReceipt(null); setOpen(false)
    await load()
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Finance Overview" />

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <StatCard label="Revenue (Month)" value={monthLabel} accent={colors.green} />
        <StatCard label="Revenue (YTD)" value={ytdLabel} accent={colors.blue} />
      </View>
      <View style={{ marginBottom: 14 }}>
        <StatCard label="Outstanding Invoices" value={outstandingLabel} accent={colors.red} />
      </View>

      <Card>
        <Text style={styles.cardTitle}>Budgets vs Spent ({year})</Text>
        {budgets.length === 0 ? (
          <EmptyState text="No budgets set for this year yet." />
        ) : (
          budgets.map(b => {
            const pct = b.allocated > 0 ? Math.min(100, Math.round((Number(b.spent ?? 0) / Number(b.allocated)) * 100)) : 0
            return (
              <View key={b.id} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.rowText}>{b.departments?.name ?? 'Department'}</Text>
                  <Text style={styles.rowSub}>{formatMoney(Number(b.spent ?? 0), 'MYR')} / {formatMoney(Number(b.allocated), 'MYR')}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? colors.red : pct >= 80 ? colors.amber : colors.green }]} />
                </View>
              </View>
            )
          })
        )}
      </Card>

      {!open ? (
        <PrimaryButton label="+ Submit Expense" onPress={() => setOpen(true)} />
      ) : (
        <Card>
          <Text style={styles.cardTitle}>Submit Expense</Text>
          {departments.length > 0 && (
            <View style={styles.chipRow}>
              {departments.map(d => (
                <Text key={d.id} onPress={() => setDepartmentId(d.id)} style={[chipStyles.chip, departmentId === d.id ? chipStyles.chipActive : null]}>{d.name}</Text>
              ))}
            </View>
          )}
          <TextField value={category} onChangeText={setCategory} placeholder="Category (e.g. Travel, Supplies)" />
          <TextField value={description} onChangeText={setDescription} placeholder="Description" />
          <TextField value={amount} onChangeText={setAmount} placeholder="Amount" keyboardType="decimal-pad" />
          <TextField value={expenseDate} onChangeText={setExpenseDate} placeholder="Date (YYYY-MM-DD, optional)" />
          <Text onPress={handleAttachReceipt} style={styles.attachLink}>
            {attachedReceipt ? 'Receipt attached ✓ (tap to replace)' : '📎 Attach receipt (optional)'}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Submit Expense" onPress={handleSubmitExpense} loading={submitting} disabled={!amount || !description} />
          <Text onPress={() => setOpen(false)} style={styles.cancelLink}>Cancel</Text>
        </Card>
      )}

      <Text style={styles.sectionLabel}>Recent Expenses ({expenses.length})</Text>
      {expenses.length === 0 ? (
        <EmptyState text="No expenses recorded yet." />
      ) : (
        <Card>
          {expenses.map(e => (
            <ListRow key={e.id} title={`${e.departments?.name ?? '—'} · ${e.category ?? '—'}`}
              subtitle={`${e.description} · ${e.expense_date ? new Date(e.expense_date).toLocaleDateString() : '—'}${receiptUrls[e.id] ? ' · Receipt attached' : ''}`}
              right={<Badge label={(e.status ?? 'pending').toUpperCase()} status={e.status ?? 'pending'} />}
              onPress={receiptUrls[e.id] ? () => Linking.openURL(receiptUrls[e.id]) : undefined} />
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
  rowText: { fontSize: 13, color: colors.text },
  rowSub: { fontSize: 12, color: colors.gray },
  barTrack: { width: '100%', height: 8, borderRadius: 999, backgroundColor: colors.grayLight },
  barFill: { height: 8, borderRadius: 999 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  attachLink: { fontSize: 13, color: colors.blue, marginBottom: 10 },
  error: { color: colors.red, fontSize: 12, marginBottom: 8 },
  cancelLink: { textAlign: 'center', color: colors.gray, fontSize: 13, marginTop: 10 },
})
