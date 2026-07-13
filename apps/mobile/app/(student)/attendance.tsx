/**
 * Mirrors apps/web/app/student/attendance (StudentAttendancePage +
 * OtpCheckinForm), plus a link to the flagship mobile-only GPS/biometric
 * check-in screen (checkin.tsx) that the web app cannot offer — see the
 * disclaimer on apps/web/app/student/location/page.tsx explaining why.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { attendanceOtp } from '../../lib/edgeFunctions'
import { colors, ScreenHeader, Card, StatCard, ListRow, Badge, EmptyState, LoadingView, PrimaryButton, TextField, MenuCard } from '../../components/ui'

type AttendanceRecord = {
  id: string; status: string | null; check_in_method: string | null; marked_at: string | null
  classes: { title: string | null; subjects: { name: string } | null } | null
}

export default function AttendanceScreen() {
  const [studentId, setStudentId] = useState('')
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [classId, setClassId] = useState('')
  const [otp, setOtp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', me.id).single()
    const sid = (studentRaw as unknown as { id: string } | null)?.id ?? ''
    setStudentId(sid)

    const { data } = await supabase
      .from('attendance_records')
      .select('id, status, check_in_method, marked_at, classes(title, subjects(name))')
      .eq('student_id', sid)
      .order('marked_at', { ascending: false })
      .limit(50)

    setRecords((data ?? []) as unknown as AttendanceRecord[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleCheckIn() {
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await attendanceOtp.validate(classId, studentId, otp)
      setSuccess('Checked in successfully.')
      setClassId(''); setOtp('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingView />

  const total = records.length
  const present = records.filter(r => r.status === 'present' || r.status === 'late').length
  const pct = total > 0 ? Math.round((present / total) * 100) : 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Attendance" />

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <StatCard label="Attendance Rate" value={`${pct}%`} accent={colors.blue} />
        <StatCard label="Sessions Recorded" value={total} accent={colors.gray} />
      </View>

      <MenuCard label="GPS + Biometric Check-In" sublabel="Face ID/fingerprint verified, location-checked" onPress={() => router.push('/(student)/checkin')} accent={colors.green} />

      <Card>
        <Text style={styles.cardTitle}>Check In with OTP</Text>
        <TextField value={classId} onChangeText={setClassId} placeholder="Class ID" />
        <TextField value={otp} onChangeText={setOtp} placeholder="6-digit OTP" keyboardType="numeric" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}
        <PrimaryButton label="Check In" onPress={handleCheckIn} loading={submitting} disabled={!classId || !otp} />
      </Card>

      <Text style={styles.sectionLabel}>History</Text>
      {records.length === 0 ? (
        <EmptyState text="No attendance records yet." />
      ) : (
        <Card>
          {records.map(r => (
            <ListRow key={r.id}
              title={r.classes?.title || r.classes?.subjects?.name || 'Class'}
              subtitle={`${r.check_in_method ?? '—'} · ${r.marked_at ? new Date(r.marked_at).toLocaleString() : '—'}`}
              right={<Badge label={(r.status ?? 'absent').toUpperCase()} status={r.status ?? 'absent'} />}
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
  error: { color: colors.red, fontSize: 12, marginBottom: 8 },
  success: { color: colors.green, fontSize: 12, marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
