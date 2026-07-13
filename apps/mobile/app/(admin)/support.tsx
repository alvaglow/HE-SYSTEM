/**
 * Mirrors apps/web/app/admin/support (AdminSupportPage + TicketQueueActions).
 * Shared by admin and management — both roles pass is_admin_or_above() RLS.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, EmptyState, LoadingView, TextField } from '../../components/ui'

type Ticket = {
  id: string; category: string; subject: string; description: string | null
  status: string; priority: string; resolution_note: string | null; created_at: string
  users: { full_name: string | null; role: string } | null
}

const STATUS_COLOR: Record<string, string> = { open: colors.amber, in_progress: colors.blue, resolved: colors.green, closed: colors.gray }
const STATUSES = ['open', 'in_progress', 'resolved', 'closed']

export default function AdminSupportScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    const { data } = await supabase.from('support_tickets')
      .select('id, category, subject, description, status, priority, resolution_note, created_at, users!support_tickets_created_by_fkey(full_name, role)')
      .eq('institution_id', me.institutionId)
      .order('created_at', { ascending: false })
      .limit(200)
    setTickets((data ?? []) as unknown as Ticket[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function setStatus(t: Ticket, status: string) {
    setSavingId(t.id)
    const me = await getMe()
    const payload: Record<string, unknown> = { status, resolution_note: (notes[t.id] ?? t.resolution_note ?? '').trim() || null, assigned_to: me!.id }
    if (status === 'resolved' || status === 'closed') payload.resolved_at = new Date().toISOString()
    await supabase.from('support_tickets').update(payload as unknown as never).eq('id', t.id)
    setSavingId(null)
    await load()
  }

  if (loading) return <LoadingView />

  const open = tickets.filter(t => t.status === 'open' || t.status === 'in_progress')
  const closed = tickets.filter(t => t.status === 'resolved' || t.status === 'closed')

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Support Tickets" />

      <Text style={styles.sectionLabel}>Open ({open.length})</Text>
      {open.length === 0 ? (
        <EmptyState text="No open tickets." />
      ) : open.map(t => (
        <Card key={t.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={styles.title}>{t.subject}</Text>
            <Text style={[styles.badge, { backgroundColor: STATUS_COLOR[t.status] + '22', color: STATUS_COLOR[t.status] }]}>
              {t.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.meta}>{t.category} · {t.users?.full_name ?? '—'} ({t.users?.role}) · {new Date(t.created_at).toLocaleDateString()}</Text>
          {t.description ? <Text style={styles.description}>{t.description}</Text> : null}
          <TextField value={notes[t.id] ?? t.resolution_note ?? ''} onChangeText={v => setNotes(n => ({ ...n, [t.id]: v }))} placeholder="Resolution note…" multiline />
          <View style={styles.actionRow}>
            {STATUSES.map(s => (
              <Text key={s}
                onPress={() => savingId === null && setStatus(t, s)}
                style={[styles.actionBtn, s === t.status && styles.actionBtnActive, savingId === t.id ? styles.disabled : null]}>
                {s.replace('_', ' ')}
              </Text>
            ))}
          </View>
        </Card>
      ))}

      <Text style={styles.sectionLabel}>Resolved / Closed ({closed.length})</Text>
      {closed.length === 0 ? (
        <EmptyState text="No resolved tickets yet." />
      ) : closed.map(t => (
        <Card key={t.id}>
          <Text style={styles.title}>{t.subject}</Text>
          <Text style={styles.meta}>{t.users?.full_name ?? '—'} · {t.status}</Text>
          {t.resolution_note ? <Text style={styles.description}>{t.resolution_note}</Text> : null}
        </Card>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  meta: { fontSize: 11, color: colors.gray, marginTop: 2 },
  description: { fontSize: 13, color: colors.gray, marginTop: 6, marginBottom: 6 },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  actionBtn: { fontSize: 11, fontWeight: '700', color: colors.gray, backgroundColor: colors.grayLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden', textTransform: 'capitalize' },
  actionBtnActive: { backgroundColor: colors.blue, color: '#fff' },
  disabled: { opacity: 0.5 },
})
