/**
 * Mirrors apps/web/app/management/reports (ManagementReportsPage +
 * ExportButton). Web downloads a CSV file; mobile has no filesystem download
 * UX equivalent, so this shares the CSV text through the native share sheet
 * (Mail, Drive, Messages, etc.) via React Native's built-in Share API —
 * no extra dependency needed.
 */
import { useCallback, useState } from 'react'
import { Text, ScrollView, StyleSheet, RefreshControl, Share } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, LoadingView, PrimaryButton } from '../../components/ui'

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n')
}

export default function ReportsScreen() {
  const [kpiRows, setKpiRows] = useState<Array<Record<string, unknown>>>([])
  const [invoiceRows, setInvoiceRows] = useState<Array<Record<string, unknown>>>([])
  const [expenseRows, setExpenseRows] = useState<Array<Record<string, unknown>>>([])
  const [partnerRows, setPartnerRows] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const now = new Date()

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const [{ data: kpiRaw }, { data: invoicesRaw }, { data: expensesRaw }, { data: partnersRaw }] = await Promise.all([
      supabase.from('kpi_records').select('period_year, period_month, total_score, grade, users(full_name)').eq('institution_id', me.institutionId).eq('period_year', now.getFullYear()).eq('period_month', now.getMonth() + 1),
      supabase.from('fee_invoices').select('invoice_number, amount, amount_paid, currency, status, due_date, students(users(full_name))').eq('institution_id', me.institutionId).order('due_date', { ascending: false }).limit(500),
      supabase.from('expenses').select('description, category, amount, currency, status, expense_date, departments(name)').eq('institution_id', me.institutionId).order('expense_date', { ascending: false }).limit(500),
      supabase.from('partners').select('company_name, tier, total_recruited, total_earned, is_active, users(full_name)').eq('institution_id', me.institutionId),
    ])

    const kpi = (kpiRaw ?? []) as unknown as Array<{ period_year: number; period_month: number; total_score: number | null; grade: string | null; users: { full_name: string | null } | null }>
    const invoices = (invoicesRaw ?? []) as unknown as Array<{ invoice_number: string; amount: number; amount_paid: number | null; currency: string; status: string | null; due_date: string | null; students: { users: { full_name: string | null } | null } | null }>
    const expenses = (expensesRaw ?? []) as unknown as Array<{ description: string; category: string | null; amount: number; currency: string; status: string | null; expense_date: string | null; departments: { name: string } | null }>
    const partners = (partnersRaw ?? []) as unknown as Array<{ company_name: string | null; tier: string | null; total_recruited: number | null; total_earned: number | null; is_active: boolean | null; users: { full_name: string | null } | null }>

    setKpiRows(kpi.map(r => ({ teacher: r.users?.full_name ?? '', period: `${r.period_year}-${String(r.period_month).padStart(2, '0')}`, score: r.total_score, grade: r.grade })))
    setInvoiceRows(invoices.map(r => ({ invoice_number: r.invoice_number, student: r.students?.users?.full_name ?? '', amount: r.amount, paid: r.amount_paid, currency: r.currency, status: r.status, due_date: r.due_date })))
    setExpenseRows(expenses.map(r => ({ department: r.departments?.name ?? '', category: r.category, description: r.description, amount: r.amount, currency: r.currency, status: r.status, date: r.expense_date })))
    setPartnerRows(partners.map(r => ({ name: r.company_name || r.users?.full_name || '', tier: r.tier, recruited: r.total_recruited, earned: r.total_earned, active: r.is_active ? 'yes' : 'no' })))
    setLoading(false)
  }, [now])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function exportReport(title: string, rows: Array<Record<string, unknown>>) {
    const csv = toCsv(rows)
    if (!csv) return
    await Share.share({ title, message: csv })
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Reports" />

      <Card>
        <Text style={styles.cardTitle}>KPI Summary — {now.toLocaleString('en-US', { month: 'long' })} {now.getFullYear()}</Text>
        <Text style={styles.desc}>Every staff/teacher KPI record calculated for the current period.</Text>
        <PrimaryButton label="Share CSV" onPress={() => exportReport('KPI Summary', kpiRows)} disabled={kpiRows.length === 0} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Invoices (last 500)</Text>
        <Text style={styles.desc}>Fee invoices with payment status, most recent due date first.</Text>
        <PrimaryButton label="Share CSV" onPress={() => exportReport('Invoices', invoiceRows)} disabled={invoiceRows.length === 0} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Expenses (last 500)</Text>
        <Text style={styles.desc}>Departmental expenses with approval status.</Text>
        <PrimaryButton label="Share CSV" onPress={() => exportReport('Expenses', expenseRows)} disabled={expenseRows.length === 0} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Partner Performance</Text>
        <Text style={styles.desc}>Every partner, tier, recruitment count, and lifetime earnings.</Text>
        <PrimaryButton label="Share CSV" onPress={() => exportReport('Partners', partnerRows)} disabled={partnerRows.length === 0} />
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  desc: { fontSize: 12, color: colors.gray, marginBottom: 12 },
})
