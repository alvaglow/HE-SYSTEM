/**
 * Mirrors apps/web/app/partner/payouts (PartnerPayoutsPage + RequestPayoutForm).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, Linking } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, StatCard, ListRow, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Payout = {
  id: string; amount: number; currency: string; status: string | null; requested_at: string; processed_at: string | null
  notes: string | null; bank_reference: string | null; receipt_url: string | null
}

export default function PayoutsScreen() {
  const [partnerId, setPartnerId] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [available, setAvailable] = useState(0)
  const [alreadyClaimed, setAlreadyClaimed] = useState(0)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [bankReference, setBankReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: partnerRaw } = await supabase.from('partners').select('id, institution_id').eq('user_id', me.id).single()
    const partnerData = partnerRaw as unknown as { id: string; institution_id: string } | null
    const pid = partnerData?.id ?? ''
    setPartnerId(pid)
    setInstitutionId(partnerData?.institution_id ?? '')

    const [{ data: commissionsRaw }, { data: payoutsRaw }] = await Promise.all([
      supabase.from('partner_commissions').select('amount_earned, status').eq('partner_id', pid),
      supabase.from('partner_payouts').select('id, amount, currency, status, requested_at, processed_at, notes, bank_reference, receipt_url').eq('partner_id', pid).order('requested_at', { ascending: false }),
    ])

    const commissions = (commissionsRaw ?? []) as unknown as Array<{ amount_earned: number; status: string | null }>
    const payoutRows = (payoutsRaw ?? []) as unknown as Payout[]

    const approvedCommissions = commissions.filter(c => c.status === 'approved' || c.status === 'paid').reduce((sum, c) => sum + Number(c.amount_earned), 0)
    const claimed = payoutRows.filter(p => p.status !== 'rejected').reduce((sum, p) => sum + Number(p.amount), 0)

    setAlreadyClaimed(claimed)
    setAvailable(Math.max(0, approvedCommissions - claimed))
    setPayouts(payoutRows)

    const urls: Record<string, string> = {}
    await Promise.all(payoutRows.filter(p => p.receipt_url).map(async p => {
      const { data } = await supabase.storage.from('receipts').createSignedUrl(p.receipt_url!, 3600)
      if (data?.signedUrl) urls[p.id] = data.signedUrl
    }))
    setReceiptUrls(urls)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleRequest() {
    setError('')
    const amt = Number(amount)
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return }
    if (amt > available) { setError(`Amount exceeds available balance of RM${available.toLocaleString()}.`); return }
    setSubmitting(true)
    const { error } = await supabase.from('partner_payouts').insert({
      partner_id: partnerId, institution_id: institutionId, amount: amt, bank_reference: bankReference || null, status: 'requested',
    } as unknown as never)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    setAmount(''); setBankReference('')
    await load()
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Payouts" />

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <StatCard label="Available to Withdraw" value={`RM${available.toLocaleString()}`} accent={colors.green} />
        <StatCard label="Already Claimed" value={`RM${alreadyClaimed.toLocaleString()}`} accent={colors.blue} />
      </View>

      <Card>
        <Text style={styles.cardTitle}>Request a Payout</Text>
        {available <= 0 ? (
          <EmptyState text="No approved commission balance available to withdraw yet." />
        ) : (
          <>
            <TextField value={amount} onChangeText={setAmount} placeholder={`Up to RM${available.toLocaleString()}`} keyboardType="decimal-pad" />
            <TextField value={bankReference} onChangeText={setBankReference} placeholder="Bank account / reference (optional)" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Request Payout" onPress={handleRequest} loading={submitting} disabled={!amount} />
          </>
        )}
      </Card>

      <Text style={styles.sectionLabel}>History ({payouts.length})</Text>
      {payouts.length === 0 ? (
        <EmptyState text="No payout requests yet." />
      ) : (
        <Card>
          {payouts.map(p => (
            <ListRow key={p.id}
              title={`${p.currency} ${Number(p.amount).toLocaleString()}`}
              subtitle={`Requested ${new Date(p.requested_at).toLocaleDateString()}${p.processed_at ? ` · Processed ${new Date(p.processed_at).toLocaleDateString()}` : ''}${p.notes ? ` · ${p.notes}` : ''}`}
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
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
  