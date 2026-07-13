/**
 * Mirrors apps/web/app/student/dashboard (StudentDashboard).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, Card, StatCard, MenuCard, LoadingView } from '../../components/ui'

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: currency === 'VND' ? 0 : 2 }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function formatClassTime(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return isToday ? `Today ${time}` : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` ${time}`
}

type Notification = { id: string; title: string; is_read: boolean }
type UpcomingClass = { id: string; title: string | null; starts_at: string; subjects: { name: string } | null }

export default function StudentDashboard() {
  const [firstName, setFirstName] = useState('')
  const [programme, setProgramme] = useState('')
  const [attendancePct, setAttendancePct] = useState<number | null>(null)
  const [totalDue, setTotalDue] = useState(0)
  const [feeCurrency, setFeeCurrency] = useState('USD')
  const [resultsCount, setResultsCount] = useState(0)
  const [nextClass, setNextClass] = useState<UpcomingClass | null>(null)
  const [upcoming, setUpcoming] = useState<UpcomingClass[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setFirstName((me.fullName ?? '').split(' ')[0] ?? '')

    const { data: student } = await supabase.from('students').select('id, programmes(name)').eq('user_id', me.id).single()
    const studentData = student as unknown as { id: string; programmes: { name?: string } | null } | null
    setProgramme(studentData?.programmes?.name ?? '')
    const studentId = studentData?.id ?? null

    const [attendanceRes, invoicesRes, resultsRes, notificationsRes, enrollmentsRes] = await Promise.all([
      studentId ? supabase.from('attendance_records').select('status').eq('student_id', studentId) : Promise.resolve({ data: [] as Array<{ status: string }> }),
      studentId ? supabase.from('fee_invoices').select('amount, amount_paid, currency').eq('student_id', studentId).in('status', ['sent', 'overdue']) : Promise.resolve({ data: [] as Array<{ amount: number; amount_paid: number; currency: string }> }),
      studentId ? supabase.from('exam_results').select('id', { count: 'exact', head: true }).eq('student_id', studentId).eq('is_published', true) : Promise.resolve({ count: 0 }),
      supabase.from('notifications').select('id, title, is_read').eq('user_id', me.id).order('created_at', { ascending: false }).limit(5),
      studentId ? supabase.from('class_enrollments').select('class_id').eq('student_id', studentId).eq('is_active', true) : Promise.resolve({ data: [] as Array<{ class_id: string }> }),
    ])

    const attendanceRows = (attendanceRes.data ?? []) as Array<{ status: string }>
    const total = attendanceRows.length
    const present = attendanceRows.filter(r => r.status === 'present' || r.status === 'late').length
    setAttendancePct(total > 0 ? Math.round((present / total) * 100) : null)

    const invoices = (invoicesRes.data ?? []) as Array<{ amount: number; amount_paid: number; currency: string }>
    setTotalDue(invoices.reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.amount_paid)), 0))
    setFeeCurrency(invoices[0]?.currency ?? 'USD')

    setResultsCount(('count' in resultsRes ? resultsRes.count : 0) ?? 0)
    setNotifications((notificationsRes.data ?? []) as unknown as Notification[])

    const classIds = ((enrollmentsRes.data ?? []) as Array<{ class_id: string }>).map(e => e.class_id)
    const nowIso = new Date().toISOString()
    const { data: upcomingClasses } = classIds.length
      ? await supabase.from('classes').select('id, title, starts_at, subjects(name)').in('id', classIds).eq('is_cancelled', false).gte('starts_at', nowIso).order('starts_at', { ascending: true }).limit(5)
      : { data: [] as UpcomingClass[] }

    const list = (upcomingClasses ?? []) as unknown as UpcomingClass[]
    setUpcoming(list)
    setNextClass(list[0] ?? null)
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
          <Text style={styles.title}>Welcome back, {firstName || 'there'}</Text>
          {programme ? <Text style={styles.subtitle}>{programme}</Text> : null}
        </View>
        <TouchableOpacity onPress={handleSignOut}><Text style={styles.signOut}>Sign out</Text></TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}><StatCard label="Attendance" value={attendancePct != null ? `${attendancePct}%` : 'No records'} accent={colors.blue} /></View>
        <View style={styles.statBox}><StatCard label="Fee Balance" value={totalDue > 0 ? formatMoney(totalDue, feeCurrency) : 'Paid up'} accent={colors.red} /></View>
        <View style={styles.statBox}><StatCard label="Next Class" value={nextClass ? formatClassTime(nextClass.starts_at) : 'None scheduled'} accent={colors.amber} /></View>
        <View style={styles.statBox}><StatCard label="Results" value={`${resultsCount} published`} accent={colors.green} /></View>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Upcoming Classes</Text>
        {upcoming.length === 0 ? (
          <Text style={styles.empty}>No upcoming classes scheduled.</Text>
        ) : (
          upcoming.map(c => (
            <View key={c.id} style={styles.classRow}>
              <Text style={styles.classTitle}>{c.title || c.subjects?.name || 'Class'}</Text>
              <Text style={styles.classTime}>{formatClassTime(c.starts_at)}</Text>
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Notifications</Text>
        {notifications.length === 0 ? (
          <Text style={styles.empty}>No new notifications.</Text>
        ) : (
          notifications.map(n => (
            <Text key={n.id} style={n.is_read ? styles.notifRead : styles.notifUnread}>{n.title}</Text>
          ))
        )}
      </Card>

      <Text style={styles.sectionLabel}>Manage</Text>
      <MenuCard label="Attendance & Check-In" sublabel="OTP check-in, GPS + biometric" onPress={() => router.push('/(student)/attendance')} accent={colors.blue} />
      <MenuCard label="Timetable" sublabel="Your class schedule" onPress={() => router.push('/(student)/timetable')} accent={colors.blue} />
      <MenuCard label="Results" sublabel="Published exam results" onPress={() => router.push('/(student)/results')} accent={colors.green} />
      <MenuCard label="Fees" sublabel="Invoices & payments" onPress={() => router.push('/(student)/fees')} accent={colors.red} />
      <MenuCard label="Wallet" sublabel="Digital wallet balance" onPress={() => router.push('/(student)/wallet')} accent={colors.purple} />
      <MenuCard label="Location" sublabel="GPS/biometric check-in history" onPress={() => router.push('/(student)/location')} accent={colors.purple} />
      <MenuCard label="Messages" sublabel="Message your teachers" onPress={() => router.push('/(student)/messages')} accent={colors.amber} />
      <MenuCard label="Announcements" sublabel="Institution-wide updates" onPress={() => router.push('/(student)/announcements')} accent={colors.gray} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: colors.blue },
  subtitle: { fontSize: 13, color: colors.gray, marginTop: 2 },
  signOut: { fontSize: 13, color: colors.red, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  statBox: { width: '47%' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
  empty: { fontSize: 13, color: colors.muted },
  classRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  classTitle: { fontSize: 13, color: colors.text },
  classTime: { fontSize: 12, color: colors.muted },
  notifRead: { fontSize: 13, color: colors.gray, marginBottom: 6 },
  notifUnread: { fontSize: 13, color: colors.text, fontWeight: '600', marginBottom: 6 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 8, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
