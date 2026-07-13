/**
 * Mirrors both apps/web/app/admin/partners (full table + add form + recruits)
 * and apps/web/app/management/partners (tier distribution + top earners) —
 * merged: everyone sees the performance summary, admin additionally gets the
 * add-partner form, full partner table, and recent recruits.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { adminCreateUser } from '../../lib/edgeFunctions'
import { colors, ScreenHeader, Card, StatCard, ListRow, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Partner = {
  id: string; company_name: string | null; referral_code?: string; tier: string | null
  total_recruited: number | null; total_earned: number | null; is_active: boolean | null
  users: { full_name: string | null; email?: string } | null
}
type Recruit = {
  id: string; student_name: string | null; student_email: string | null
  status: string | null; tuition_fee: number | null; created_at: string
  partners: { company_name: string | null; users: { full_name: string | null } | null } | null
}

const TIERS = ['platinum', 'gold', 'silver', 'bronze', 'starter']

export default function PartnersScreen() {
  const [role, setRole] = useState('admin')
  const [partners, setPartners] = useState<Partner[]>([])
  const [recruits, setRecruits] = useState<Recruit[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setRole(me.role)

    const [{ data: partnersRaw }, { data: recruitsRaw }] = await Promise.all([
      supabase.from('partners')
        .select('id, company_name, referral_code, tier, total_recruited, total_earned, is_active, users(full_name, email)')
        .eq('institution_id', me.institutionId)
        .order('total_earned', { ascending: false }),
      supabase.from('partner_recruits')
        .select('id, student_name, student_email, status, tuition_fee, created_at, partners(company_name, users(full_name))')
        .eq('institution_id', me.institutionId)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    setPartners((partnersRaw ?? []) as unknown as Partner[])
    setRecruits((recruitsRaw ?? []) as unknown as Recruit[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleCreate() {
    setSubmitting(true)
    setError('')
    try {
      const res = await adminCreateUser({ fullName, email, password, role: 'partner' })
      if (res?.error) { setError(res.error); return }
      setFullName(''); setEmail(''); setPassword(''); setOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create partner')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingView />

  const tierCounts = new Map<string, number>()
  let totalEarned = 0
  for (const p of partners) {
    const tier = p.tier ?? 'starter'
    tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1)
    totalEarned += Number(p.total_earned ?? 0)
  }
  const activeCount = partners.filter(p => p.is_active).length
  const top10 = partners.slice(0, 10)

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Partners" />

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <StatCard label="Active" value={`${activeCount} / ${partners.length}`} accent={colors.blue} />
        <StatCard label="Total Earned" value={`RM${totalEarned.toLocaleString()}`} accent={colors.green} />
      </View>

      <Card>
        <Text style={styles.cardTitle}>Tier Distribution</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {TIERS.map(t => (
            <Badge key={t} label={`${t}: ${tierCounts.get(t) ?? 0}`} />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Top 10 Earners</Text>
        {top10.length === 0 ? <EmptyState text="No partners yet." /> : top10.map(p => (
          <ListRow key={p.id} title={p.company_name || p.users?.full_name || '—'}
            subtitle={`${(p.tier ?? 'starter').toUpperCase()} · ${p.total_recruited ?? 0} recruited`}
            right={<Text style={styles.score}>RM{Number(p.total_earned ?? 0).toLocaleString()}</Text>} />
        ))}
      </Card>

      {role !== 'management' && (
        <>
          {!open ? (
            <PrimaryButton label="+ Add Partner" onPress={() => setOpen(true)} />
          ) : (
            <Card>
              <Text style={styles.cardTitle}>Add Partner</Text>
              <TextField value={fullName} onChangeText={setFullName} placeholder="Full name" />
              <TextField value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" />
              <TextField value={password} onChangeText={setPassword} placeholder="Temporary password (min 8 chars)" secureTextEntry />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton label="Create Partner" onPress={handleCreate} loading={submitting} disabled={!fullName || !email || password.length < 8} />
              <Text onPress={() => setOpen(false)} style={styles.cancelLink}>Cancel</Text>
            </Card>
          )}

          <Text style={styles.sectionLabel}>All Partners ({partners.length})</Text>
          {partners.length === 0 ? (
            <EmptyState text="No partners yet. Add the first one above." />
          ) : (
            <Card>
              {partners.map(p => (
                <ListRow key={p.id} title={p.company_name || p.users?.full_name || '—'}
                  subtitle={`${p.referral_code ?? ''} · ${p.total_recruited ?? 0} recruited`}
                  right={<Badge label={p.is_active ? 'Active' : 'Inactive'} status={p.is_active ? 'active' : 'inactive'} />} />
              ))}
            </Card>
          )}

          <Text style={styles.sectionLabel}>Recent Recruits ({recruits.length})</Text>
          {recruits.length === 0 ? (
            <EmptyState text="No recruits recorded yet." />
          ) : (
            <Card>
              {recruits.map(r => (
                <ListRow key={r.id} title={r.student_name ?? r.student_email ?? '—'}
                  subtitle={`${r.partners?.company_name || r.partners?.users?.full_name || '—'} · ${r.tuition_fee != null ? `RM${Number(r.tuition_fee).toLocaleString()}` : '—'}`}
                  right={<Badge label={(r.status ?? 'prospect').toUpperCase()} status={r.status ?? 'prospect'} />} />
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
  score: { fontWeight: '700', color: colors.blue },
  error: { color: colors.red, fontSize: 12, marginBottom: 8 },
  cancelLink: { textAlign: 'center', color: colors.gray, fontSize: 13, marginTop: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
