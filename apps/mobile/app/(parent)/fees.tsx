/**
 * Mirrors apps/web/app/parent/fees (ParentFeesPage + PayNowButton). Web
 * redirects the browser tab to the ZaloPay checkout URL; mobile opens it in
 * an in-app browser via expo-web-browser (see app.json's plugin list —
 * already a dependency for OAuth-style redirect flows).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { payments } from '../../lib/edgeFunctions'
import { colors, ScreenHeader, Card, Badge, EmptyState, LoadingView, PrimaryButton } from '../../components/ui'

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: currency === 'VND' ? 0 : 2 }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

type Invoice = {
  id: string; invoice_number: string; amount: number; amount_paid: number | null; currency: string
  status: string | null; due_date: string | null; description: string | null; institution_id: string
}
type ChildBlock = { id: string; name: string; invoices: Invoice[] }

export default function ParentFeesScreen() {
  const [userId, setUserId] = useState('')
  const [blocks, setBlocks] = useState<ChildBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payError, setPayError] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setUserId(me.id)

    const { data: linksRaw } = await supabase
      .from('parent_student_links')
      .select('students(id, users(full_name))')
      .eq('parent_user_id', me.id)
    const links = (linksRaw ?? []) as unknown as Array<{ students: { id: string; users: { full_name: string | null } | null } | null }>
    const children = links.map(l => l.students).filter((s): s is { id: string; users: { full_name: string | null } | null } => !!s)

    const results = await Promise.all(children.map(async child => {
      const { data: invoicesRaw } = await supabase
        .from('fee_invoices')
        .select('id, invoice_number, amount, amount_paid, currency, status, due_date, description, institution_id')
        .eq('student_id', child.id)
        .order('due_date', { ascending: false })
      return { id: child.id, name: child.users?.full_name ?? 'Child', invoices: (invoicesRaw ?? []) as unknown as Invoice[] }
    }))

    setBlocks(results)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handlePay(inv: Invoice, remaining: number) {
    setPayingId(inv.id)
    setPayError(prev => ({ ...prev, [inv.id]: '' }))
    try {
      const result = await payments.zalopay.create({
        invoiceId: inv.id, userId, institutionId: inv.institution_id,
        amountVnd: Math.round(remaining), description: `Invoice ${inv.invoice_number}`,
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Fees" />
      {blocks.length === 0 ? (
        <EmptyState text="No children linked to your account yet. Contact admin." />
      ) : (
        blocks.map(b => (
          <Card key={b.id}>
            <Text style={styles.childHeader}>{b.name}</Text>
            {b.invoices.length === 0 ? (
              <EmptyState text="No invoices yet." />
            ) : (
              b.invoices.map(inv => {
                const remaining = Number(inv.amount) - Number(inv.amount_paid ?? 0)
                const payable = remaining > 0 && (inv.status === 'sent' || inv.status === 'overdue')
                return (
                  <View key={inv.id} style={styles.invoiceBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.invNumber}>{inv.invoice_number}</Text>
                        {inv.description ? <Text style={styles.invDesc}>{inv.description}</Text> : null}
                      </View>
                      <Badge label={(inv.status ?? 'draft').toUpperCase()} status={inv.status ?? 'draft'} />
                    </View>
                    <Text style={styles.invAmount}>
                      {formatMoney(Number(inv.amount_paid ?? 0), inv.currency)} / {formatMoney(Number(inv.amount), inv.currency)}
                      {inv.due_date ? ` · due ${new Date(inv.due_date).toLocaleDateString()}` : ''}
                    </Text>
                    {payable && (
                      inv.currency !== 'VND' ? (
                        <Text style={styles.contactNote}>Billed in {inv.currency}. Contact the institution to arrange payment.</Text>
                      ) : (
                        <>
                          <PrimaryButton label={payingId === inv.id ? 'Redirecting…' : `Pay ${formatMoney(remaining, inv.currency)} with ZaloPay`} onPress={() => handlePay(inv, remaining)} loading={payingId === inv.id} />
                          {payError[inv.id] ? <Text style={styles.error}>{payError[inv.id]}</Text> : null}
                        </>
                      )
                    )}
                  </View>
                )
              })
            )}
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  childHeader: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
  invoiceBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  invNumber: { fontSize: 13, fontWeight: '700', color: colors.text },
  invDesc: { fontSize: 12, color: colors.gray, marginTop: 2 },
  invAmount: { fontSize: 12, color: colors.gray, marginTop: 8, marginBottom: 8 },
  contactNote: { fontSize: 11, color: colors.muted },
  error: { color: colors.red, fontSize: 12, marginTop: 6 },
})
