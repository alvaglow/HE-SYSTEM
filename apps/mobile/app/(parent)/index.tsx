/**
 * Mirrors apps/web/app/parent/dashboard (ParentDashboard) — per-child
 * attendance %, outstanding fees, and published results count.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, Card, MenuCard, LoadingView, EmptyState } from '../../components/ui'

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${amount.toFixed(0)} ${currency}`
  }
}

type Child = { id: string; name: string; attendancePct: number | null; outstanding: number; currency: string; resultsCount: number }

export default function ParentDashboard() {
  const [name, setName] = useState<string | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setName(me.fullName)

    const { data: links } = await supabase
      .from('parent_student_links')
      .select('students(id, users(full_name))')
      .eq('parent_user_id', me.id)

    const parentLinks = (links ?? []) as unknown as Array<{ students: { id: string; users: { full_name: string | null } | null } | null }>
    const kids = parentLinks.map(l => l.students).filter((s): s is { id: string; users: { full_name: string | null } | null } => !!s)

    const results = await Promise.all(kids.map(async child => {
      const [{ data: attendanceRaw }, { data: invoicesRaw }, { count: resultsCount }] = await Promise.all([
        supabase.from('attendance_records').select('status').eq('student_id', child.id),
        supabase.from('fee_invoices').select('amount, amount_paid, currency').eq('student_id', child.id).in('status', ['sent', 'overdue']),
        supabase.from('exam_results').select('id', { count: 'exact', head: true }).eq('student_id', child.id).eq('is_published', true),
      ])
      const attendance = (attendanceRaw ?? []) as unknown as Array<{ status: string }>
      const invoices = (invoicesRaw ?? []) as unknown as Array<{ amount: number; amount_paid: number; currency: string }>
      const total = attendance.length
      const present = attendance.filter(a => a.status === 'present' || a.status === 'late').length
      const attendancePct = total > 0 ? Math.round((present / total) * 100) : null
      const outstanding = invoices.reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.amount_paid)), 0)
      const currency = invoices[0]?.currency ?? 'USD'
      return { id: child.id, name: child.users?.full_name ?? 'Child', attendancePct, outstanding, currency, resultsCount: resultsCount ?? 0 }
    }))

    setChildren(results)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Parent Dashboard</Text>
          {name ? <Text style={styles.subtitle}>Signed in as {name}</Text> : null}
        </View>
        <TouchableOpacity onPress={handleSignOut}><Text style={styles.signOut}>Sign out</Text></TouchableOpacity>
      </View>

      {children.length === 0 ? (
        <EmptyState text="No children linked to your account yet. Contact admin." />
      ) : (
        children.map(child => (
          <Card key={child.id}>
            <Text style={styles.childName}>{child.name}</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.blue }]}>{child.attendancePct != null ? `${child.attendancePct}%` : '—'}</Text>
                <Text style={styles.statLabel}>Attendance</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.red }]}>{child.outstanding > 0 ? formatMoney(child.outstanding, child.currency) : 'Paid up'}</Text>
                <Text style={styles.statLabel}>Outstanding Fees</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.green }]}>{child.resultsCount}</Text>
                <Text style={styles.statLabel}>Results</Text>
              </View>
            </View>
          </Card>
        ))
      )}

      <Text style={styles.sectionLabel}>Manage</Text>
      <MenuCard label="Attendance" sublabel="Class attendance per child" onPress={() => router.push('/(parent)/attendance')} accent={colors.blue} />
      <MenuCard label="Results" sublabel="Published exam results" onPress={() => router.push('/(parent)/results')} accent={colors.green} />
      <MenuCard label="Fees" sublabel="Invoices & pay outstanding fees" onPress={() => router.push('/(parent)/fees')} accent={colors.red} />
      <MenuCard label="Location" sublabel="GPS/biometric check-in history" onPress={() => router.push('/(parent)/location')} accent={colors.purple} />
      <MenuCard label="Messages" sublabel="Message your children's teachers" onPress={() => router.push('/(parent)/messages')} accent={colors.amber} />
      <MenuCard label="Announcements" sublabel="Institution-wide updates" onPress={() => router.push('/(parent)/announcements')} accent={colors.gray} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.blue },
  subtitle: { fontSize: 13, color: colors.gray, marginTop: 2 },
  signOut: { fontSize: 13, color: colors.red, fontWeight: '600' },
  childName: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, color: colors.gray, marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 8, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
