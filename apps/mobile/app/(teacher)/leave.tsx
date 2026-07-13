/**
 * Mirrors apps/web/app/teacher/leave (TeacherLeavePage + RequestLeaveForm).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type LeaveRequest = {
  id: string; leave_type: string; start_date: string; end_date: string
  reason: string | null; status: string | null; review_note: string | null
}

const LEAVE_TYPES = ['sick', 'annual', 'emergency', 'unpaid', 'other']

export default function LeaveScreen() {
  const [userId, setUserId] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [leaveType, setLeaveType] = useState('sick')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setUserId(me.id)
    setInstitutionId(me.institutionId)

    const { data } = await supabase
      .from('leave_requests')
      .select('id, leave_type, start_date, end_date, reason, status, review_note')
      .eq('user_id', me.id)
      .order('created_at', { ascending: false })

    setRequests((data ?? []) as unknown as LeaveRequest[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleSubmit() {
    setError('')
    if (endDate < startDate) { setError('End date must be on or after start date.'); return }
    setSubmitting(true)
    const { error } = await supabase.from('leave_requests').insert({
      institution_id: institutionId, user_id: userId, leave_type: leaveType,
      start_date: startDate, end_date: endDate, reason, status: 'pending',
    } as unknown as never)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    setStartDate(''); setEndDate(''); setReason('')
    await load()
  }

  async function handleCancel(id: string) {
    await supabase.from('leave_requests').update({ status: 'cancelled' } as unknown as never).eq('id', id)
    await load()
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Leave" />

      <Card>
        <Text style={styles.cardTitle}>Request Leave</Text>
        <Text style={styles.label}>Type</Text>
        <View style={styles.chipRow}>
          {LEAVE_TYPES.map(t => (
            <Text key={t} onPress={() => setLeaveType(t)} style={[chipStyles.chip, leaveType === t ? chipStyles.chipActive : null]}>{t}</Text>
          ))}
        </View>
        <TextField value={startDate} onChangeText={setStartDate} placeholder="Start date (YYYY-MM-DD)" />
        <TextField value={endDate} onChangeText={setEndDate} placeholder="End date (YYYY-MM-DD)" />
        <TextField value={reason} onChangeText={setReason} placeholder="Reason (optional)" multiline />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label="Submit Request" onPress={handleSubmit} loading={submitting} disabled={!startDate || !endDate} />
      </Card>

      <Text style={styles.sectionLabel}>My Requests ({requests.length})</Text>
      {requests.length === 0 ? (
        <EmptyState text="No leave requests yet." />
      ) : (
        <Card>
          {requests.map(r => (
            <ListRow key={r.id}
              title={`${r.leave_type.charAt(0).toUpperCase()}${r.leave_type.slice(1)} · ${new Date(r.start_date).toLocaleDateString()} – ${new Date(r.end_date).toLocaleDateString()}`}
              subtitle={r.review_note ?? r.reason ?? undefined}
              right={<Badge label={(r.status ?? 'pending').toUpperCase()} status={r.status ?? 'pending'} />}
              onPress={r.status === 'pending' ? () => handleCancel(r.id) : undefined}
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
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
})
