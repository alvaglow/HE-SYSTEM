/**
 * Mirrors apps/web/app/student/fees (StudentFeesPage + PayNowButton).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { payments } from '../../lib/edgeFunctions'
import { colors, ScreenHeader, Card, StatCard, Badge, EmptyState, LoadingView, PrimaryButton } from '../../components/ui'

type Invoice = {
  id: string; invoice_number: string | null; amount: number; amount_paid: number | null; currency: string
  status: string | null; due_date: string | null; description: string | null
}

export default function StudentFeesScreen() {
  const [userId, setUserId] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payError, setPayError] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setUserId(me.id)
    setInstitutionId(me.institutionId)

    const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', me.id).single()
    const studentId = (studentRaw as unknown as { id: string } | null)?.id ?? ''

    const { data } = await supabase
      .from('fee_invoices')
      .select('id, invoice_number, amount, amount_paid, currency, status, due_date, description')
      .eq('student_id', studentId)
      .order('due_date', { ascending: false })

    setInvoices((data ?? []) as unknown as Invoice[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handlePay(inv: Invoice, remaining: number) {
    setPayingId(inv.id)
    setPayError(prev => ({ ...prev, [inv.id]: '' }))
    try {
      const result = await payments.zalopay.create({
        invoiceId: inv.id, userId, institutionId,
        amountVnd: Math.round(remaining), description: inv.description ?? `Invoice ${inv.invoice_number ?? inv.id.slice(0, 8)}`,
        idempotencyKey: `${inv.id}-${Date.now()}`,
      }) as { orderUrl?: string; error?: string; missing?: string[] }

      if (result.error) {
        setPayError(prev => ({ ...prev, [inv.id]: result.missing?.length ? `${result.error} (missing: ${result.missing.join(', ')})` : result.error! }))
        return
      }
      if (result.orderUrl) {
        await WebBrowser.openBrowserAsync(result.orderUrl)
        await load()
      } else {
        setPayError(prev => ({ ...prev, [inv.id]: 'Payment gateway did not return a checkout link' }))
      }
    } catch (e) {
      setPayError(prev => ({ ...prev, [inv.id]: e instanceof Error ? e.message : 'Payment initiation failed' }))
    } finally {
      setPayingId(null)
    }
  }

  if (loading) return <LoadingView />

  const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + (Number(i.amount) - Number(i.amount_paid ?? 0)), 0)

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Fees" />

      <View style={{ marginBottom: 14 }}>
        <StatCard label="Total Outstanding" value={outstanding.toLocaleString()} accent={colors.red} />
      </View>

      <Text style={styles.sectionLabel}>Invoices ({invoices.length})</Text>
      {invoices.length === 0 ? (
        <EmptyState text="No invoices yet." />
      ) : (
        invoices.map(inv => {
          const remaining = Number(inv.amount) - Number(inv.amount_paid ?? 0)
          const payable = (inv.status === 'sent' || inv.status === 'overdue') && remaining > 0
          return (
            <Card key={inv.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.invNumber}>{inv.invoice_number ?? inv.id.slice(0, 8)}</Text>
                  {inv.description ? <Text style={styles.invDesc}>{inv.description}</Text> : null}
                </View>
                <Badge label={(inv.status ?? 'draft').toUpperCase()} status={inv.status ?? 'draft'} />
              </View>
              <Text style={styles.invAmount}>
                {inv.currency} {Number(inv.amount).toLocaleString()}
                {inv.due_date ? ` · due ${new Date(inv.due_date).toLocaleDateString()}` : ''}
              </Text>
              {payable && (
                inv.currency !== 'VND' ? (
                  <Text style={styles.contactNote}>Billed in {inv.currency}. Contact the institution to arrange payment.</Text>
                ) : (
                  <>
                    <PrimaryButton label={payingId === inv.id ? 'Redirecting…' : `Pay ${remaining.toLocaleString()} VND with ZaloPay`} onPress={() => handlePay(inv, remaining)} loading={payingId === inv.id} />
                    {payError[inv.id] ? <Text style={styles.error}>{payError[inv.id]}</Text> : null}
                  </>
                )
              )}
            </Card>
          )
        })
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  invNumber: { fontSize: 13, fontWeight: '700', color: colors.text },
  invDesc: { fontSize: 12, color: colors.gray, marginTop: 2 },
  invAmount: { fontSize: 12, color: colors.gray, marginTop: 8, marginBottom: 8 },
  contactNote: { fontSize: 11, color: colors.muted },
  error: { color: colors.red, fontSize: 12, marginTop: 6 },
})
