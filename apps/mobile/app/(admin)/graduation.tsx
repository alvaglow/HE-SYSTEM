/**
 * Mirrors apps/web/app/admin/graduation (AdminGraduationPage + ReviewActions).
 * Shared by admin and management.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, EmptyState, LoadingView, TextField } from '../../components/ui'

type Application = {
  id: string; status: string; total_credit_hours_completed: number; cgpa_at_application: number | null; applied_at: string; review_notes: string | null
  students: { student_number: string; users: { full_name: string | null } | null } | null
  programmes: { name: string; required_credit_hours: number | null } | null
}

const STATUS_COLOR: Record<string, string> = { pending: colors.amber, approved: colors.green, rejected: colors.red }

export default function AdminGraduationScreen() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [decidingId, setDecidingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    const { data } = await supabase.from('graduation_applications')
      .select('id, status, total_credit_hours_completed, cgpa_at_application, applied_at, review_notes, students(student_number, users(full_name)), programmes(name, required_credit_hours)')
      .eq('institution_id', me.institutionId)
      .order('applied_at', { ascending: false })
      .limit(200)
    setApps((data ?? []) as unknown as Application[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function decide(a: Application, status: 'approved' | 'rejected') {
    setDecidingId(a.id)
    const me = await getMe()
    await supabase.from('graduation_applications').update({
      status, review_notes: (notes[a.id] ?? '').trim() || null, reviewed_by: me!.id, reviewed_at: new Date().toISOString(),
    } as unknown as never).eq('id', a.id)
    setDecidingId(null)
    await load()
  }

  if (loading) return <LoadingView />

  const pending = apps.filter(a => a.status === 'pending')
  const decided = apps.filter(a => a.status !== 'pending')

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Graduation Applications" />

      <Text style={styles.sectionLabel}>Pending ({pending.length})</Text>
      {pending.length === 0 ? <EmptyState text="No pending applications." /> : pending.map(a => (
        <Card key={a.id}>
          <Text style={styles.title}>{a.students?.users?.full_name ?? '—'} ({a.students?.student_number})</Text>
          <Text style={styles.meta}>{a.programmes?.name}</Text>
          <Text style={styles.meta}>CGPA: {a.cgpa_at_application ?? '—'} · Credits: {a.total_credit_hours_completed} / {a.programmes?.required_credit_hours ?? '—'}</Text>
          <TextField value={notes[a.id] ?? ''} onChangeText={v => setNotes(n => ({ ...n, [a.id]: v }))} placeholder="Review notes…" multiline />
          <View style={styles.actionRow}>
            <Text onPress={() => decidingId === null && decide(a, 'approved')} style={[styles.actionBtn, styles.approveBtn, decidingId === a.id ? styles.disabled : null]}>
              {decidingId === a.id ? 'Working…' : 'Approve'}
            </Text>
            <Text onPress={() => decidingId === null && decide(a, 'rejected')} style={[styles.actionBtn, styles.rejectBtn, decidingId === a.id ? styles.disabled : null]}>
              {decidingId === a.id ? 'Working…' : 'Reject'}
            </Text>
          </View>
        </Card>
      ))}

      <Text style={styles.sectionLabel}>Reviewed ({decided.length})</Text>
      {decided.length === 0 ? <EmptyState text="No reviewed applications yet." /> : decided.map(a => (
        <Card key={a.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.title}>{a.students?.users?.full_name ?? '—'}</Text>
            <Text style={[styles.badge, { backgroundColor: STATUS_COLOR[a.status] + '22', color: STATUS_COLOR[a.status] }]}>{a.status.toUpperCase()}</Text>
          </View>
          <Text style={styles.meta}>{a.programmes?.name}</Text>
          {a.review_notes ? <Text style={styles.meta}>{a.review_notes}</Text> : null}
        </Card>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.gray, marginTop: 2 },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  actionRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  actionBtn: { fontSize: 12, fontWeight: '700', color: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, overflow: 'hidden' },
  approveBtn: { backgroundColor: colors.green },
  rejectBtn: { backgroundColor: colors.red },
  disabled: { opacity: 0.5 },
})
