/**
 * Mirrors apps/web/app/partner/commission (PartnerCommissionPage).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, StatCard, ListRow, Badge, EmptyState, LoadingView } from '../../components/ui'

type Commission = {
  id: string; students_at_time: number; commission_pct: number; tuition_fee: number; amount_earned: number
  tier_at_time: string; status: string | null; calculated_at: string
  partner_recruits: { student_name: string | null } | null
}

export default function CommissionScreen() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: partnerRaw } = await supabase.from('partners').select('id').eq('user_id', me.id).single()
    const partnerId = (partnerRaw as unknown as { id: string } | null)?.id ?? ''

    const { data } = await supabase
      .from('partner_commissions')
      .select('id, students_at_time, commission_pct, tuition_fee, amount_earned, tier_at_time, status, calculated_at, partner_recruits(student_name)')
      .eq('partner_id', partnerId)
      .order('calculated_at', { ascending: false })

    setCommissions((data ?? []) as unknown as Commission[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  const totals = commissions.reduce((acc, c) => {
    const amt = Number(c.amount_earned)
    if (c.status === 'paid') acc.paid += amt
    else if (c.status === 'approved') acc.approved += amt
    else if (c.status === 'pending') acc.pending += amt
    return acc
  }, { paid: 0, approved: 0, pending: 0 })

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Commission" />

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <StatCard label="Paid Out" value={`RM${totals.paid.toLocaleString()}`} accent={colors.green} />
        <StatCard label="Approved" value={`RM${totals.approved.toLocaleString()}`} accent={colors.blue} />
      </View>
      <View style={{ marginBottom: 14 }}>
        <StatCard label="Pending Review" value={`RM${totals.pending.toLocaleString()}`} accent={colors.amber} />
      </View>

      <Text style={styles.sectionLabel}>History ({commissions.length})</Text>
      {commissions.length === 0 ? (
        <EmptyState text="No commissions recorded yet. Refer a student to get started." />
      ) : (
        <Card>
          {commissions.map(c => (
            <ListRow key={c.id}
              title={c.partner_recruits?.student_name ?? '—'}
              subtitle={`RM${Number(c.tuition_fee).toLocaleString()} tuition · ${c.commission_pct}% · ${new Date(c.calculated_at).toLocaleDateString()}`}
              right={
                <View style={{ alignItems: 'flex-end' }}>
                  <Badge label={(c.status ?? 'pending').toUpperCase()} status={c.status ?? 'pending'} />
                </View>
              }
            />
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
