/**
 * Mirrors apps/web/app/student/support (self-service ticket create + list).
 * Identical implementation duplicated across (student)/(teacher)/(parent)
 * route groups per this codebase's mobile convention.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

const CATEGORIES = [
  ['general', 'General'], ['it', 'IT'], ['academic', 'Academic'], ['financial', 'Financial'], ['facilities', 'Facilities'],
] as const

type Ticket = {
  id: string; category: string; subject: string; description: string | null
  status: string; priority: string; resolution_note: string | null; created_at: string
}

const STATUS_COLOR: Record<string, string> = { open: colors.amber, in_progress: colors.blue, resolved: colors.green, closed: colors.gray }

export default function SupportScreen() {
  const [institutionId, setInstitutionId] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>('general')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)
    const { data } = await supabase.from('support_tickets')
      .select('id, category, subject, description, status, priority, resolution_note, created_at')
      .eq('created_by', me.id)
      .order('created_at', { ascending: false })
    setTickets((data ?? []) as unknown as Ticket[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function submit() {
    if (!subject.trim()) { setError('Subject is required.'); return }
    setSubmitting(true)
    setError('')
    const me = await getMe()
    const { error: insertErr } = await supabase.from('support_tickets').insert({
      institution_id: institutionId, created_by: me!.id, category,
      subject: subject.trim(), description: description.trim() || null,
    } as unknown as never)
    setSubmitting(false)
    if (insertErr) { setError(insertErr.message); return }
    setSubject(''); setDescription(''); setCategory('general')
    await load()
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Support" />

      <Card>
        <Text style={styles.sectionTitle}>Submit a Ticket</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map(([value, label]) => (
            <Pressable key={value} onPress={() => setCategory(value)} style={[styles.chip, category === value && styles.chipActive]}>
              <Text style={[styles.chipText, category === value && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <TextField value={subject} onChangeText={setSubject} placeholder="Subject" />
        <View style={{ height: 8 }} />
        <TextField value={description} onChangeText={setDescription} placeholder="Describe your issue…" multiline />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: 8 }} />
        <PrimaryButton label="Submit Ticket" onPress={submit} loading={submitting} disabled={!subject.trim()} />
      </Card>

      <Text style={styles.sectionTitle}>My Tickets ({tickets.length})</Text>
      {tickets.length === 0 ? (
        <EmptyState text="No tickets submitted yet." />
      ) : tickets.map(t => (
        <Card key={t.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={styles.title}>{t.subject}</Text>
            <Text style={[styles.badge, { backgroundColor: STATUS_COLOR[t.status] + '22', color: STATUS_COLOR[t.status] }]}>
              {t.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.meta}>{t.category} · {new Date(t.created_at).toLocaleDateString()}</Text>
          {t.description ? <Text style={styles.description}>{t.description}</Text> : null}
          {t.resolution_note ? <Text style={styles.resolution}>Resolution: {t.resolution_note}</Text> : null}
        </Card>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.grayLight },
  chipActive: { backgroundColor: colors.blue },
  chipText: { fontSize: 12, color: colors.gray },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  title: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  meta: { fontSize: 11, color: colors.gray, marginTop: 2 },
  description: { fontSize: 13, color: colors.gray, marginTop: 6 },
  resolution: { fontSize: 12, color: colors.green, marginTop: 6, backgroundColor: colors.greenLight, borderRadius: 8, padding: 8 },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  error: { color: colors.red, fontSize: 12, marginTop: 4 },
})
