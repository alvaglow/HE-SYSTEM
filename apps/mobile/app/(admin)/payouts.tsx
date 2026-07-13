/**
 * Mirrors apps/web/app/admin/payouts (AdminPayoutsPage + PayoutDecisionForm).
 * Shared by admin and management — both roles pass is_admin_or_above() RLS.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, Linking } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { notifySend } from '../../lib/edgeFunctions'
import { pickAndUpload } from '../../lib/uploadFile'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView, TextField } from '../../components/ui'

type Payout = {
  id: string; amount: number; currency: string; status: string | null
  requested_at: string; processed_at: string | null; notes: string | null
  bank_reference: string | null; receipt_url: string | null
  partners: { company_name: string | null; user_id: string; users: { full_name: string | null; email: string } | null } | null
}

export default function AdminPayoutsScreen() {
  const [institutionId, setInstitutionId] = useState('')
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})
  const [workingId, setWorkingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)

    const { data } = await supabase
      .from('partner_payouts')
      .select('id, amount, currency, status, requested_at, processed_at, notes, bank_reference, receipt_url, partners(company_name, user_id, users(full_name, email))')
      .eq('institution_id', me.institutionId)
      .order('requested_at', { ascending: false })
      .limit(100)

    const rows = (data ?? []) as unknown as Payout[]
    setPayouts(rows)

    const urls: Record<string, string> = {}
    await Promise.all(rows.filter(p => p.receipt_url).map(async p => {
      const { data: signed } = await supabase.storage.from('receipts').createSignedUrl(p.receipt_url!, 3600)
      if (signed?.signedUrl) urls[p.id] = signed.signedUrl
    }))
    setReceiptUrls(urls)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function decide(p: Payout, status: 'processing' | 'completed' | 'rejected', withReceipt: boolean) {
    setWorkingId(p.id)
    let receiptPath: string | null = null
    if (withReceipt) {
      const { path, error } = await pickAndUpload('receipts', `${institutionId}/payouts`)
      if (error) { setWorkingId(null); return }
      receiptPath = path
    }

    await supabase.from('partner_payouts').update({
      status,
      processed_at: status === 'completed' || status === 'rejected' ? new Date().toISOString() : null,
      notes: noteDraft[p.id] || null,
      ...(receiptPath ? { receipt_url: receiptPath } : {}),
    } as unknown as never).eq('id', p.id)

    if (p.partners?.user_id) {
      try {
        await notifySend({
          userId: p.partners.user_id,
          title: status === 'completed' ? 'Payout completed' : status === 'rejected' ? 'Payout rejected' : 'Payout being processed',
          body: status === 'completed' ? 'Your payout has been paid out — check the receipt in your Payouts page.'
            : status === 'rejected' ? (noteDraft[p.id] || 'Your payout request was rejected.') : 'Your payout request is now being processed.',
          channel: ['in_app', 'push', 'email'],
          referenceType: 'partner_payouts',
          referenceId: p.id,
        })
      } catch (err) {
        console.error('notifySend failed (non-fatal):', err)
      }
    }

    setWorkingId(null)
    await load()
  }

  if (loading) return <LoadingView />

  const pending = payouts.filter(p => p.status === 'requested' || p.status === 'processing')
  const decided = payouts.filter(p => p.status === 'completed' || p.status === 'rejected')

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Partner Payouts" />

      <Text style={styles.sectionLabel}>Pending / Processing ({pending.length})</Text>
      {pending.length === 0 ? (
        <EmptyState text="No pending payout requests." />
      ) : (
        pending.map(p => (
          <Card key={p.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <View>
                <Text style={styles.title}>{p.partners?.company_name || p.partners?.users?.full_name || 'Partner'}</Text>
                <Text style={styles.subtitle}>{p.currency} {Number(p.amount).toLocaleString()}</Text>
                {p.bank_reference ? <Text style={styles.subtitle}>Bank ref: {p.bank_reference}</Text> : null}
              </View>
              <Badge label={(p.status ?? 'requested').toUpperCase()} status={p.status ?? 'requested'} />
            </View>
            <TextField value={noteDraft[p.id] ?? ''} onChangeText={t => setNoteDraft(prev => ({ ...prev, [p.id]: t }))} placeholder="Note (optional)" />
            <View style={styles.actionRow}>
              <Text onPress={() => workingId === null && decide(p, 'processing', false)} style={[styles.actionBtn, { backgroundColor: colors.blue }]}>
                {workingId === p.id ? 'Working…' : 'Processing'}
              </Text>
              <Text onPress={() => workingId === null && decide(p, 'completed', true)} style={[styles.actionBtn, { backgroundColor: colors.green }]}>
                {workingId === p.id ? 'Working…' : 'Complete + Receipt'}
              </Text>
              <Text onPress={() => workingId === null && decide(p, 'rejected', false)} style={[styles.actionBtn, { backgroundColor: colors.red }]}>
                {workingId === p.id ? 'Working…' : 'Reject'}
              </Text>
            </View>
          </Card>
        ))
      )}

      <Text style={styles.sectionLabel}>History ({decided.length})</Text>
      {decided.length === 0 ? (
        <EmptyState text="No completed or rejected payouts yet." />
      ) : (
        <Card>
          {decided.map(p => (
            <ListRow key={p.id}
              title={`${p.partners?.company_name || p.partners?.users?.full_name || 'Partner'} · ${p.currency} ${Number(p.amount).toLocaleString()}`}
              subtitle={p.processed_at ? new Date(p.processed_at).toLocaleDateString() : undefined}
              right={<Badge label={(p.status ?? 'requested').toUpperCase()} status={p.status ?? 'requested'} />}
              onPress={receiptUrls[p.id] ? () => Linking.openURL(receiptUrls[p.id]) : undefined}
            />
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.gray, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  actionBtn: { fontSize: 11, fontWeight: '700', color: colors.white, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, overflow: 'hidden' },
})
