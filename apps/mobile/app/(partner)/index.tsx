/**
 * Mirrors apps/web/app/partner/dashboard (PartnerDashboard + CopyReferralButton).
 * Web copies the referral link to clipboard; mobile has no clipboard
 * dependency installed, so this shares it through the native share sheet
 * instead (same Share API used in the admin Reports screen).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Share } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { getCommissionPct, getPartnerTier } from '@he-system/shared/utils/commission-formula'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, Card, MenuCard, LoadingView } from '../../components/ui'

type Partner = { total_recruited: number | null; total_earned: number | null; referral_code: string }

export default function PartnerDashboard() {
  const [name, setName] = useState<string | null>(null)
  const [partner, setPartner] = useState<Partner | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setName(me.fullName)

    const { data } = await supabase.from('partners').select('total_recruited, total_earned, referral_code').eq('user_id', me.id).single()
    setPartner((data ?? null) as unknown as Partner | null)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  if (loading) return <LoadingView />

  const students = partner?.total_recruited ?? 0
  const pct = getCommissionPct(students)
  const tier = getPartnerTier(students)
  const referralLink = `https://app.happyenglish.edu.vn/enrol?ref=${partner?.referral_code ?? ''}`
  const pctToNext = tier.maxStudents ? Math.min(100, (students / tier.maxStudents) * 100) : 100

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Partner Dashboard</Text>
          <Text style={styles.subtitle}>{tier.emoji} {tier.label} — {pct}% commission rate</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut}><Text style={styles.signOut}>Sign out</Text></TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.blue }]}>{students}</Text>
          <Text style={styles.statLabel}>Students Recruited</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.amber }]}>{pct}%</Text>
          <Text style={styles.statLabel}>Commission Rate</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.green }]}>RM{(partner?.total_earned ?? 0).toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Earned</Text>
        </View>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Tier Progress</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={styles.progressLabel}>{tier.emoji} {tier.label}</Text>
          <Text style={styles.progressLabel}>{students} students</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pctToNext}%` }]} />
        </View>
        {tier.maxStudents && (
          <Text style={styles.progressNote}>{tier.maxStudents - students} more students to next tier</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Referral Link</Text>
        <Text style={styles.referralText} selectable>{referralLink}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={() => Share.share({ message: referralLink })}>
          <Text style={styles.shareBtnText}>Share Referral Link</Text>
        </TouchableOpacity>
      </Card>

      <Text style={styles.sectionLabel}>Manage</Text>
      <MenuCard label="Recruited Students" sublabel="Your referral roster" onPress={() => router.push('/(partner)/students')} accent={colors.blue} />
      <MenuCard label="Commission" sublabel="Earnings history" onPress={() => router.push('/(partner)/commission')} accent={colors.green} />
      <MenuCard label="Payouts" sublabel="Withdraw approved commission" onPress={() => router.push('/(partner)/payouts')} accent={colors.amber} />
      <MenuCard label="Leaderboard" sublabel="Ranked by students recruited" onPress={() => router.push('/(partner)/leaderboard')} accent={colors.purple} />
      <MenuCard label="Profile" sublabel="Company & bank details" onPress={() => router.push('/(partner)/profile')} accent={colors.gray} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.blue },
  subtitle: { fontSize: 13, color: colors.gray, marginTop: 2 },
  signOut: { fontSize: 13, color: colors.red, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 17, fontWeight: '700' },
  statLabel: { fontSize: 11, color: colors.gray, marginTop: 2, textAlign: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
  progressLabel: { fontSize: 12, color: colors.gray },
  barTrack: { width: '100%', height: 10, borderRadius: 999, backgroundColor: colors.grayLight },
  barFill: { height: 10, borderRadius: 999, backgroundColor: colors.amber },
  progressNote: { fontSize: 11, color: colors.muted, marginTop: 8 },
  referralText: { fontSize: 12, color: colors.gray, backgroundColor: colors.grayLight, padding: 10, borderRadius: 8, marginBottom: 10 },
  shareBtn: { backgroundColor: colors.blue, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  shareBtnText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 8, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
