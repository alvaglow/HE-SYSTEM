/**
 * Mirrors apps/web/app/admin/leave (AdminLeavePage + LeaveDecisionButtons).
 * Shared by admin and management — both roles pass is_admin_or_above() RLS.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { notifySend } from '../../lib/edgeFunctions'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView } from '../../components/ui'

type LeaveRequest = {
  id: string; user_id: string; leave_type: string; start_date: string; end_date: string
  reason: string | null; status: string | null; review_note: string | null
  users: { full_name: string | null; role: string } | null
}

export default function AdminLeaveScreen() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [decidingId, setDecidingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data } = await supabase
      .from('leave_requests')
      .select('id, user_id, leave_type, start_date, end_date, reason, status, review_note, users(full_name, role)')
      .eq('institution_id', me.institutionId)
      .order('created_at', { ascending: false })
      .limit(100)

    setRequests((data ?? []) as unknown as LeaveRequest[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function decide(req: LeaveRequest, status: 'approved' | 'rejected') {
    setDecidingId(req.id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('leave_requests').update({
      status, reviewed_by: user!.id, reviewed_at: new Date().toISOString(),
    } as unknown as never).eq('id', req.id)

    // notify-send is staff-gated — this call comes from a real admin/
    // management session, so it passes the requireStaff check directly.
    try {
      await notifySend({
        userId: req.user_id,
        title: status === 'approved' ? 'Leave request approved' : 'Leave request rejected',
        body: status === 'approved' ? 'Your leave request has been approved.' : 'Your leave request was not approved. Check with your admin for details.',
        channel: ['in_app', 'push', 'email'],
        referenceType: 'leave_requests',
        referenceId: req.id,
      })
    } catch (err) {
      console.error('notifySend failed (non-fatal):', err)
    }

    setDecidingId(null)
    await load()
  }

  if (loading) return <LoadingView />

  const pending = requests.filter(r => r.status === 'pending')
  const decided = requests.filter(r => r.status !== 'pending')

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Leave Requests" />

      <Text style={styles.sectionLabel}>Pending Approval ({pending.length})</Text>
      {pending.length === 0 ? (
        <EmptyState text="No pending leave requests." />
      ) : (
        <Card>
          {pending.map(r => (
            <View key={r.id} style={styles.row}>
              <Text style={styles.title}>{r.users?.full_name ?? 'Unknown'} · {r.leave_type}</Text>
              <Text style={styles.subtitle}>
                {new Date(r.start_date).toLocaleDateString()} – {new Date(r.end_date).toLocaleDateString()}
              </Text>
              {r.reason ? <Text style={styles.reason}>{r.reason}</Text> : null}
              <View style={styles.actionRow}>
                <Text
                  onPress={() => decidingId === null && decide(r, 'approved')}
                  style={[styles.actionBtn, styles.approveBtn, decidingId === r.id ? styles.disabled : null]}>
                  {decidingId === r.id ? 'Working…' : 'Approve'}
                </Text>
                <Text
                  onPress={() => decidingId === null && decide(r, 'rejected')}
                  style={[styles.actionBtn, styles.rejectBtn, decidingId === r.id ? styles.disabled : null]}>
                  {decidingId === r.id ? 'Working…' : 'Reject'}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      <Text style={styles.sectionLabel}>History ({decided.length})</Text>
      {decided.length === 0 ? (
        <EmptyState text="No reviewed leave requests yet." />
      ) : (
        <Card>
          {decided.map(r => (
            <ListRow key={r.id}
              title={`${r.users?.full_name ?? 'Unknown'} · ${r.leave_type}`}
              subtitle={r.review_note ?? r.reason ?? undefined}
              right={<Badge label={(r.status ?? 'pending').toUpperCase()} status={r.status ?? 'pending'} />}
            />
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  title: { fontSize: 13, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 12, color: colors.gray, marginTop: 2 },
  reason: { fontSize: 12, color: colors.gray, marginTop: 4, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  actionBtn: { fontSize: 12, fontWeight: '700', color: colors.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, overflow: 'hidden' },
  approveBtn: { backgroundColor: colors.green },
  rejectBtn: { backgroundColor: colors.red },
  disabled: { opacity: 0.5 },
})
