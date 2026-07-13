/**
 * Mirrors apps/web/app/partner/profile (PartnerProfilePage + ProfileForm).
 * Tier, referral code, and totals are read-only here — same
 * partners_lock_sensitive_fields DB trigger enforces it server-side too.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, StatCard, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Partner = {
  id: string; company_name: string | null; bank_name: string | null; bank_account: string | null; bank_holder: string | null
  tier: string | null; referral_code: string | null; total_recruited: number | null; total_earned: number | null; is_active: boolean
}

export default function ProfileScreen() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankHolder, setBankHolder] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data } = await supabase
      .from('partners')
      .select('id, company_name, bank_name, bank_account, bank_holder, tier, referral_code, total_recruited, total_earned, is_active')
      .eq('user_id', me.id)
      .single()

    const p = (data ?? null) as unknown as Partner | null
    setPartner(p)
    if (p) {
      setCompanyName(p.company_name ?? '')
      setBankName(p.bank_name ?? '')
      setBankAccount(p.bank_account ?? '')
      setBankHolder(p.bank_holder ?? '')
    }
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleSave() {
    if (!partner) return
    setSaving(true)
    setError('')
    setSaved(false)
    const { error } = await supabase.from('partners').update({
      company_name: companyName, bank_name: bankName, bank_account: bankAccount, bank_holder: bankHolder,
    } as unknown as never).eq('id', partner.id)
    setSaving(false)
    if (error) { setError(error.message); return }
    setSaved(true)
    await load()
  }

  if (loading) return <LoadingView />
  if (!partner) return <EmptyState text="Partner profile not found." />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Profile" />

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <StatCard label="Total Recruited" value={partner.total_recruited ?? 0} accent={colors.blue} />
        <View style={{ flex: 1 }}>
          <Card>
            <Text style={styles.statLabelSmall}>Tier</Text>
            <Badge label={(partner.tier ?? 'starter').toUpperCase()} />
          </Card>
        </View>
      </View>
      <Card>
        <Text style={styles.statLabelSmall}>Referral Code</Text>
        <Text style={styles.referralCode}>{partner.referral_code ?? '—'}</Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Edit Profile</Text>
        <Text style={styles.note}>Tier, referral code, and earnings totals are managed by your institution and cannot be edited here.</Text>
        <TextField value={companyName} onChangeText={setCompanyName} placeholder="Company Name" />
        <TextField value={bankName} onChangeText={setBankName} placeholder="Bank Name" />
        <TextField value={bankAccount} onChangeText={setBankAccount} placeholder="Bank Account Number" />
        <TextField value={bankHolder} onChangeText={setBankHolder} placeholder="Bank Account Holder" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saved ? <Text style={styles.saved}>Saved.</Text> : null}
        <PrimaryButton label="Save Changes" onPress={handleSave} loading={saving} />
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statLabelSmall: { fontSize: 12, color: colors.gray, marginBottom: 6 },
  referralCode: { fontSize: 16, fontWeight: '700', color: colors.blue, fontFamily: 'monospace' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 6 },
  note: { fontSize: 11, color: colors.muted, marginBottom: 12 },
  error: { color: colors.red, fontSize: 12, marginBottom: 8 },
  saved: { color: colors.green, fontSize: 12, marginBottom: 8 },
})
