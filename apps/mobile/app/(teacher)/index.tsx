/**
 * Mirrors apps/web/app/teacher/dashboard (TeacherDashboard).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, Card, StatCard, MenuCard, LoadingView } from '../../components/ui'

function formatClassTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

type ClassToday = { id: string; title: string | null; starts_at: string; subjects: { name: string } | null }

export default function TeacherDashboard() {
  const [name, setName] = useState('')
  const [kpi, setKpi] = useState<{ total_score: number | null; grade: string | null } | null>(null)
  const [classesToday, setClassesToday] = useState<ClassToday[]>([])
  const [pendingMarking, setPendingMarking] = useState(0)
  const [atRisk, setAtRisk] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setName(me.fullName ?? '')

    const { data: teacherRaw } = await supabase.from('teachers').select('id').eq('user_id', me.id).single()
    const teacherId = (teacherRaw as unknown as { id: string } | null)?.id ?? null

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)

    const [kpiRes, classesTodayRes, pendingMarkingRes, myClassesRes] = await Promise.all([
      supabase.from('kpi_records').select('total_score, grade').eq('user_id', me.id)
        .order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(1).maybeSingle(),
      teacherId
        ? supabase.from('classes').select('id, title, starts_at, subjects(name)').eq('teacher_id', teacherId).eq('is_cancelled', false)
            .gte('starts_at', todayStart.toISOString()).lte('starts_at', todayEnd.toISOString()).order('starts_at', { ascending: true })
        : Promise.resolve({ data: [] as ClassToday[] }),
      teacherId ? supabase.from('exam_results').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId).is('score', null) : Promise.resolve({ count: 0 }),
      teacherId ? supabase.from('classes').select('id').eq('teacher_id', teacherId) : Promise.resolve({ data: [] as Array<{ id: string }> }),
    ])

    setKpi((kpiRes.data ?? null) as unknown as { total_score: number | null; grade: string | null } | null)
    setClassesToday((classesTodayRes.data ?? []) as unknown as ClassToday[])
    setPendingMarking(('count' in pendingMarkingRes ? pendingMarkingRes.count : 0) ?? 0)

    const classIds = ((myClassesRes.data ?? []) as Array<{ id: string }>).map(c => c.id)
    let atRiskCount = 0
    if (classIds.length > 0) {
      const { data: recordsRaw } = await supabase.from('attendance_records').select('student_id, status').in('class_id', classIds)
      const records = (recordsRaw ?? []) as unknown as Array<{ student_id: string; status: string }>
      const byStudent = new Map<string, { present: number; total: number }>()
      for (const r of records) {
        const entry = byStudent.get(r.student_id) ?? { present: 0, total: 0 }
        entry.total += 1
        if (r.status === 'present' || r.status === 'late') entry.present += 1
        byStudent.set(r.student_id, entry)
      }
      atRiskCount = [...byStudent.values()].filter(v => v.total >= 3 && v.present / v.total < 0.75).length
    }
    setAtRisk(atRiskCount)
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
          <Text style={styles.title}>Teacher Dashboard</Text>
          <Text style={styles.subtitle}>Welcome, {name}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut}><Text style={styles.signOut}>Sign out</Text></TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}><StatCard label="KPI Score" value={kpi?.total_score != null ? `${kpi.total_score} (${kpi.grade})` : 'No data'} accent={colors.blue} /></View>
        <View style={styles.statBox}><StatCard label="Classes Today" value={classesToday.length} accent={colors.green} /></View>
        <View style={styles.statBox}><StatCard label="Pending Marking" value={pendingMarking} accent={colors.amber} /></View>
        <View style={styles.statBox}><StatCard label="At-Risk Students" value={atRisk} accent={colors.red} /></View>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Today's Classes</Text>
        {classesToday.length === 0 ? (
          <Text style={styles.empty}>No classes scheduled for today.</Text>
        ) : (
          classesToday.map(c => (
            <View key={c.id} style={styles.classRow}>
              <Text style={styles.classTitle}>{c.title || c.subjects?.name || 'Class'}</Text>
              <Text style={styles.classTime}>{formatClassTime(c.starts_at)}</Text>
            </View>
          ))
        )}
      </Card>

      <Text style={styles.sectionLabel}>Manage</Text>
      <MenuCard label="Attendance" sublabel="Generate check-in OTP, view today's check-ins" onPress={() => router.push('/(teacher)/attendance')} accent={colors.blue} />
      <MenuCard label="Timetable" sublabel="Your class schedule" onPress={() => router.push('/(teacher)/timetable')} accent={colors.blue} />
      <MenuCard label="Students" sublabel="Your class rosters" onPress={() => router.push('/(teacher)/students')} accent={colors.green} />
      <MenuCard label="Grades" sublabel="Enter & publish exam results" onPress={() => router.push('/(teacher)/grades')} accent={colors.purple} />
      <MenuCard label="Assignments" sublabel="Create, collect, and grade coursework" onPress={() => router.push('/(teacher)/assignments')} accent={colors.purple} />
      <MenuCard label="Exam Timetable" sublabel="Upcoming exam schedule" onPress={() => router.push('/(teacher)/exams')} accent={colors.red} />
      <MenuCard label="Facility Finder" sublabel="Find a free room" onPress={() => router.push('/(teacher)/facilities')} accent={colors.blue} />
      <MenuCard label="Campus Shuttle" sublabel="Shuttle routes & times" onPress={() => router.push('/(teacher)/shuttle')} accent={colors.blue} />
      <MenuCard label="My KPI" sublabel="Performance breakdown" onPress={() => router.push('/(teacher)/kpi')} accent={colors.purple} />
      <MenuCard label="Leave" sublabel="Request & track leave" onPress={() => router.push('/(teacher)/leave')} accent={colors.amber} />
      <MenuCard label="Messages" sublabel="Message your students" onPress={() => router.push('/(teacher)/messages')} accent={colors.gray} />
      <MenuCard label="Announcements" sublabel="Institution-wide updates" onPress={() => router.push('/(teacher)/announcements')} accent={colors.gray} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: colors.blue },
  subtitle: { fontSize: 13, color: colors.gray, marginTop: 2 },
  signOut: { fontSize: 13, color: colors.red, fontWeight: '600' },