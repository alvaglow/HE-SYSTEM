/**
 * Admin / Management dashboard — mirrors apps/web/app/admin/dashboard and
 * apps/web/app/management/dashboard, merged into one role-aware screen
 * since mobile routes both roles into this same group (see _layout.tsx).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, Card, StatCard, MenuCard, LoadingView } from '../../components/ui'
import { TouchableOpacity } from 'react-native'

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${amount.toFixed(0)} ${currency}`
  }
}

type Stats = {
  studentCount: number | null
  teacherCount: number | null
  overdueCount: number | null
  pendingPayouts: number | null
  partnerCount: number | null
  revenueLabel: string
  avgKpi: number | null
}

export default function AdminDashboard() {
  const [name, setName] = useState<string | null>(null)
  const [role, setRole] = useState<string>('admin')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setName(me.fullName)
    setRole(me.role)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      { count: studentCount },
      { count: teacherCount },
      { count: overdueCount },
      { count: pendingPayouts },
      { count: partnerCount },
      { data: paymentsThisMonth },
      { data: kpiThisMonth },
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('institution_id', me.institutionId),
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('institution_id', me.institutionId),
      supabase.from('fee_invoices').select('*', { count: 'exact', head: true }).eq('institution_id', me.institutionId).eq('status', 'overdue'),
      supabase.from('partner_payouts').select('*', { count: 'exact', head: true }).eq('status', 'requested'),
      supabase.from('partners').select('*', { count: 'exact', head: true }).eq('institution_id', me.institutionId),
      supabase.from('fee_payments').select('amount, invoice:fee_invoices(currency)').gte('paid_at', monthStart),
      supabase.from('kpi_records').select('total_score').eq('institution_id', me.institutionId).eq('period_year', now.getFullYear()).eq('period_month', now.getMonth() + 1),
    ])

    const payments = (paymentsThisMonth ?? []) as unknown as Array<{ amount: number; invoice: { currency?: string } | null }>
    const revenueByCurrency = new Map<string, number>()
    for (const p of payments) {
      const cur = p.invoice?.currency ?? 'USD'
      revenueByCurrency.set(cur, (revenueByCurrency.get(cur) ?? 0) + Number(p.amount))
    }
    const revenueLabel = revenueByCurrency.size > 0
      ? [...revenueByCurrency.entries()].map(([c, a]) => formatMoney(a, c)).join(' + ')
      : '—'

    const kpiRecords = (kpiThisMonth ?? []) as unknown as Array<{ total_score: number | null }>
    const scores = kpiRecords.map(k => Number(k.total_score)).filter(n => !Number.isNaN(n))
    const avgKpi = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

    setStats({ studentCount, teacherCount, overdueCount, pendingPayouts, partnerCount, revenueLabel, avgKpi })
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  if (loading) return <LoadingView />

  const isManagement = role === 'management'

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{isManagement ? 'Leadership Overview' : 'Admin Dashboard'}</Text>
          {name ? <Text style={styles.subtitle}>Signed in as {name}</Text> : null}
        </View>
        <TouchableOpacity onPress={handleSignOut}><Text style={styles.signOut}>Sign out</Text></TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {isManagement ? (
          <>
            <StatCard label="Total Students" value={stats?.studentCount ?? '—'} accent={colors.blue} />
            <StatCard label="Active Partners" value={stats?.partnerCount ?? '—'} accent={colors.amber} />
          </>
        ) : (
          <>
            <StatCard label="Total Students" value={stats?.studentCount ?? '—'} accent={colors.blue} />
            <StatCard label="Teachers" value={stats?.teacherCount ?? '—'} accent={colors.green} />
          </>
        )}
      </View>
      <View style={styles.statsRow}>
        {isManagement ? (
          <>
            <StatCard label="Revenue (Month)" value={stats?.revenueLabel ?? '—'} accent={colors.green} />
            <StatCard label="Avg KPI Score" value={stats?.avgKpi != null ? `${stats.avgKpi}%` : '—'} accent={colors.purple} />
          </>
        ) : (
          <>
            <StatCard label="Overdue Invoices" value={stats?.overdueCount ?? '—'} accent={colors.red} />
            <StatCard label="Pending Payouts" value={stats?.pendingPayouts ?? '—'} accent={colors.amber} />
          </>
        )}
      </View>

      <Text style={styles.sectionLabel}>Manage</Text>

      {isManagement ? (
        <>
          <MenuCard label="Enrolment" sublabel="Class enrolments across the institution" onPress={() => router.push('/(admin)/enrolment')} accent={colors.blue} />
          <MenuCard label="Finance" sublabel="Revenue, budgets, and expenses" onPress={() => router.push('/(admin)/finance')} accent={colors.green} />
          <MenuCard label="KPI" sublabel="Teacher & staff performance" onPress={() => router.push('/(admin)/kpi')} accent={colors.purple} />
          <MenuCard label="Partners" sublabel="Partner performance & tiers" onPress={() => router.push('/(admin)/partners')} accent={colors.amber} />
          <MenuCard label="Payouts" sublabel="Approve partner payout requests" onPress={() => router.push('/(admin)/payouts')} accent={colors.green} />
          <MenuCard label="Leave" sublabel="Approve staff leave requests" onPress={() => router.push('/(admin)/leave')} accent={colors.red} />
          <MenuCard label="Reports" sublabel="Export CSV reports" onPress={() => router.push('/(admin)/reports')} accent={colors.gray} />
          <MenuCard label="Library" sublabel="Digital library resources" onPress={() => router.push('/(admin)/library')} accent={colors.blue} />
          <MenuCard label="Rooms" sublabel="Campus room directory" onPress={() => router.push('/(admin)/rooms')} accent={colors.blue} />
          <MenuCard label="Exams" sublabel="Exam timetable" onPress={() => router.push('/(admin)/exams')} accent={colors.red} />
          <MenuCard label="Financial Aid" sublabel="Scholarships & loans" onPress={() => router.push('/(admin)/financial-aid')} accent={colors.amber} />
          <MenuCard label="Shuttle" sublabel="Campus bus routes" onPress={() => router.push('/(admin)/shuttle')} accent={colors.blue} />
        </>
      ) : (
        <>
          <MenuCard label="Students" sublabel="Add & manage student records" onPress={() => router.push('/(admin)/students')} accent={colors.blue} />
          <MenuCard label="Staff" sublabel="Teachers & support staff" onPress={() => router.push('/(admin)/staff')} accent={colors.green} />
          <MenuCard label="Enrolment" sublabel="Class enrolments" onPress={() => router.push('/(admin)/enrolment')} accent={colors.blue} />
          <MenuCard label="Invoices" sublabel="Fee invoices & payments" onPress={() => router.push('/(admin)/invoices')} accent={colors.red} />
          <MenuCard label="KPI" sublabel="Performance records" onPress={() => router.push('/(admin)/kpi')} accent={colors.purple} />
          <MenuCard label="Partners" sublabel="Referral partners & recruits" onPress={() => router.push('/(admin)/partners')} accent={colors.amber} />
          <MenuCard label="Payouts" sublabel="Approve partner payout requests" onPress={() => router.push('/(admin)/payouts')} accent={colors.green} />
          <MenuCard label="Leave" sublabel="Approve staff leave requests" onPress={() => router.push('/(admin)/leave')} accent={colors.red} />
          <MenuCard label="Timetable" sublabel="Class schedule" onPress={() => router.push('/(admin)/timetable')} accent={colors.blue} />
          <MenuCard label="Announcements" sublabel="Institution-wide messages" onPress={() => router.push('/(admin)/announcements')} accent={colors.gray} />
          <MenuCard label="Library" sublabel="Digital library resources" onPress={() => router.push('/(admin)/library')} accent={colors.blue} />
          <MenuCard label="Rooms" sublabel="Campus room directory" onPress={() => router.push('/(admin)/rooms')} accent={colors.blue} />
          <MenuCard label="Exams" sublabel="Exam timetable" onPress={() => router.push('/(admin)/exams')} accent={colors.red} />
          <MenuCard label="Financial Aid" sublabel="Scholarships & loans" onPress={() => router.push('/(admin)/financial-aid')} accent={colors.amber} />
          <MenuCard label="Shuttle" sublabel="Campus bus routes" onPress={() => router.push('/(admin)/shuttle')} accent={colors.blue} />
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.blue },
  subtitle: { fontSize: 13, color: colors.gray, marginTop: 2 },
  signOut: { fontSize: 13, color: colors.red, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 8, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
