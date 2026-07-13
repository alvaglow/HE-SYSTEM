/**
 * Mirrors apps/web/app/teacher/attendance (TeacherAttendancePage + GenerateOtpForm).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { attendanceOtp } from '../../lib/edgeFunctions'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView, PrimaryButton } from '../../components/ui'

type ClassOption = { id: string; label: string }
type Checkin = {
  id: string; status: string | null; check_in_method: string | null; marked_at: string | null; class_id: string
  students: { student_number: string; users: { full_name: string | null } | null } | null
}

export default function TeacherAttendanceScreen() {
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [classLabel, setClassLabel] = useState<Map<string, string>>(new Map())
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [otp, setOtp] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: teacherRaw } = await supabase.from('teachers').select('id').eq('user_id', me.id).single()
    const teacherId = (teacherRaw as unknown as { id: string } | null)?.id ?? ''

    const { data: classesRaw } = await supabase.from('classes').select('id, title, subjects(name)').eq('teacher_id', teacherId).order('starts_at', { ascending: false }).limit(20)
    const classRows = (classesRaw ?? []) as unknown as Array<{ id: string; title: string | null; subjects: { name: string } | null }>
    const options = classRows.map(c => ({ id: c.id, label: c.title || c.subjects?.name || 'Class' }))
    setClasses(options)
    setClassLabel(new Map(options.map(o => [o.id, o.label])))

    const classIds = classRows.map(c => c.id)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const { data: checkinsRaw } = classIds.length > 0
      ? await supabase.from('attendance_records')
          .select('id, status, check_in_method, marked_at, class_id, students(student_number, users(full_name))')
          .in('class_id', classIds).gte('marked_at', todayStart.toISOString()).order('marked_at', { ascending: false })
      : { data: [] }
    setCheckins((checkinsRaw ?? []) as unknown as Checkin[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    setOtp('')
    try {
      const result = await attendanceOtp.generate(selectedClassId) as { otp?: string; expiresAt?: string; error?: string }
      if (result.error) { setError(result.error); return }
      setOtp(result.otp ?? '')
      setExpiresAt(result.expiresAt ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate OTP.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Attendance" />

      <Card>
        <Text style={styles.cardTitle}>Generate Check-In OTP</Text>
        {classes.length === 0 ? (
          <EmptyState text="No classes assigned to you yet." />
        ) : (
          <>
            <View style={styles.chipRow}>
              {classes.map(c => (
                <Text key={c.id} onPress={() => setSelectedClassId(c.id)} style={[chipStyles.chip, selectedClassId === c.id ? chipStyles.chipActive : null]}>{c.label}</Text>
              ))}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Generate OTP" onPress={handleGenerate} loading={generating} disabled={!selectedClassId} />
            {otp ? (
              <View style={styles.otpBox}>
                <Text style={styles.otpLabel}>Share this code with your class</Text>
                <Text style={styles.otpValue}>{otp}</Text>
                {expiresAt ? <Text style={styles.otpExpiry}>Expires {new Date(expiresAt).toLocaleTimeString()}</Text> : null}
              </View>
            ) : null}
          </>
        )}
      </Card>

      <Text style={styles.sectionLabel}>Today's Check-Ins ({checkins.length})</Text>
      {checkins.length === 0 ? (
        <EmptyState text="No check-ins recorded today yet." />
      ) : (
        <Card>
          {checkins.map(c => (
            <ListRow key={c.id}
              title={c.students?.users?.full_name ?? c.students?.student_number ?? '—'}
              subtitle={`${classLabel.get(c.class_id) ?? '—'} · ${c.check_in_method ?? '—'} · ${c.marked_at ? new Date(c.marked_at).toLocaleTimeString() : '—'}`}
              right={<Badge label={(c.status ?? 'absent').toUpperCase()} status={c.status ?? 'absent'} />}
            />
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

const chipStyles = StyleSheet.create({
  chip: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.grayLight, color: colors.gray, marginRight: 6, marginBottom: 6, overflow: 'hidden' },
  chipActive: { backgroundColor: colors.blue, color: colors.white },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  error: { color: colors.red, fontSize: 12, marginBottom: 8 },
  otpBox: { marginTop: 14, padding: 14, borderRadius: 10, backgroundColor: colors.blueLight, alignItems: 'center' },
  otpLabel: { fontSize: 11, color: colors.gray, marginBottom: 4 },
  otpValue: { fontSize: 30, fontWeight: '700', color: colors.blue, letterSpacing: 6 },
  otpExpiry: { fontSize: 11, color: colors.muted, marginTop: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
