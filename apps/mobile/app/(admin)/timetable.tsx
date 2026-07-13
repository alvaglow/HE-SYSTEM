/**
 * Mirrors apps/web/app/admin/timetable (AdminTimetablePage + AddClassForm).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type ClassRow = {
  id: string; title: string | null; starts_at: string; ends_at: string
  location_name: string | null; room_number: string | null
  is_cancelled: boolean | null; checkin_method: string | null
  subjects: { name: string } | null
  teachers: { users: { full_name: string | null } | null } | null
}
type Option = { id: string; label: string }

export default function TimetableScreen() {
  const [institutionId, setInstitutionId] = useState('')
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [subjects, setSubjects] = useState<Option[]>([])
  const [teachers, setTeachers] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [subjectId, setSubjectId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [locationName, setLocationName] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [checkinMethod, setCheckinMethod] = useState<'otp' | 'gps_biometric'>('otp')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)

    const [{ data: classesRaw }, { data: subjectsRaw }, { data: teachersRaw }] = await Promise.all([
      supabase.from('classes')
        .select('id, title, starts_at, ends_at, location_name, room_number, is_cancelled, checkin_method, subjects(name), teachers(users(full_name))')
        .eq('institution_id', me.institutionId).order('starts_at', { ascending: false }).limit(100),
      supabase.from('subjects').select('id, name').eq('institution_id', me.institutionId).eq('is_active', true),
      supabase.from('teachers').select('id, users(full_name)').eq('institution_id', me.institutionId).eq('is_active', true),
    ])

    setClasses((classesRaw ?? []) as unknown as ClassRow[])
    setSubjects(((subjectsRaw ?? []) as unknown as Array<{ id: string; name: string }>).map(s => ({ id: s.id, label: s.name })))
    setTeachers(((teachersRaw ?? []) as unknown as Array<{ id: string; users: { full_name: string | null } | null }>)
      .map(t => ({ id: t.id, label: t.users?.full_name ?? 'Unnamed teacher' })))
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleCreate() {
    setSubmitting(true)
    setError('')
    const { error } = await supabase.from('classes').insert({
      institution_id: institutionId, subject_id: subjectId, teacher_id: teacherId,
      title: title || null, starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(),
      location_name: locationName || null, room_number: roomNumber || null,
      checkin_method: checkinMethod, class_type: 'campus',
    } as unknown as never)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    setSubjectId(''); setTeacherId(''); setTitle(''); setStartsAt(''); setEndsAt('')
    setLocationName(''); setRoomNumber(''); setCheckinMethod('otp'); setOpen(false)
    await load()
  }

  async function handleCancel(id: string) {
    await supabase.from('classes').update({ is_cancelled: true } as unknown as never).eq('id', id)
    await load()
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Timetable" />

      {!open ? (
        <PrimaryButton label="+ Schedule Class" onPress={() => setOpen(true)} />
      ) : (
        <Card>
          <Text style={styles.cardTitle}>Schedule Class</Text>
          <Text style={styles.label}>Subject</Text>
          <View style={styles.chipRow}>
            {subjects.map(s => (
              <Text key={s.id} onPress={() => setSubjectId(s.id)} style={[chipStyles.chip, subjectId === s.id ? chipStyles.chipActive : null]}>{s.label}</Text>
            ))}
          </View>
          <Text style={styles.label}>Teacher</Text>
          <View style={styles.chipRow}>
            {teachers.map(t => (
              <Text key={t.id} onPress={() => setTeacherId(t.id)} style={[chipStyles.chip, teacherId === t.id ? chipStyles.chipActive : null]}>{t.label}</Text>
            ))}
          </View>
          <TextField value={title} onChangeText={setTitle} placeholder="Class title (optional)" />
          <TextField value={startsAt} onChangeText={setStartsAt} placeholder="Starts at (YYYY-MM-DD HH:mm)" />
          <TextField value={endsAt} onChangeText={setEndsAt} placeholder="Ends at (YYYY-MM-DD HH:mm)" />
          <TextField value={locationName} onChangeText={setLocationName} placeholder="Location name" />
          <TextField value={roomNumber} onChangeText={setRoomNumber} placeholder="Room number" />
          <Text style={styles.label}>Check-in method</Text>
          <View style={styles.chipRow}>
            <Text onPress={() => setCheckinMethod('otp')} style={[chipStyles.chip, checkinMethod === 'otp' ? chipStyles.chipActive : null]}>OTP code</Text>
            <Text onPress={() => setCheckinMethod('gps_biometric')} style={[chipStyles.chip, checkinMethod === 'gps_biometric' ? chipStyles.chipActive : null]}>GPS + biometric</Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Schedule Class" onPress={handleCreate} loading={submitting} disabled={!subjectId || !teacherId || !startsAt || !endsAt} />
          <Text onPress={() => setOpen(false)} style={styles.cancelLink}>Cancel</Text>
        </Card>
      )}

      <Text style={styles.sectionLabel}>Scheduled Classes ({classes.length})</Text>
      {classes.length === 0 ? (
        <EmptyState text="No classes scheduled yet. Add the first one above." />
      ) : (
        <Card>
          {classes.map(c => (
            <ListRow
              key={c.id}
              title={c.title || c.subjects?.name || '—'}
              subtitle={`${c.teachers?.users?.full_name ?? '—'} · ${new Date(c.starts_at).toLocaleString()} · ${[c.location_name, c.room_number].filter(Boolean).join(' · ') || '—'}`}
              right={<Badge label={c.is_cancelled ? 'Cancelled' : 'Scheduled'} status={c.is_cancelled ? 'cancelled' : 'active'} />}
              onPress={!c.is_cancelled ? () => handleCancel(c.id) : undefined}
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
  label: { fontSize: 12, color: colors.gray, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  error: { color: colors.red, fontSize: 12, marginBottom: 8 },
  cancelLink: { textAlign: 'center', color: colors.gray, fontSize: 13, marginTop: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
