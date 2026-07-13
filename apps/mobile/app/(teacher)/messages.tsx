/**
 * Mirrors apps/web/app/teacher/messages (TeacherMessagesPage + ComposeForm).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { messageSend } from '../../lib/edgeFunctions'
import { colors, ScreenHeader, Card, ListRow, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type FeedItem = { id: string; direction: 'sent' | 'received'; other: string; content: string; created_at: string }
type Recipient = { id: string; label: string }

export default function TeacherMessagesScreen() {
  const [userId, setUserId] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [recipientId, setRecipientId] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setUserId(me.id)
    setInstitutionId(me.institutionId)

    const { data: teacherRaw } = await supabase.from('teachers').select('id').eq('user_id', me.id).single()
    const teacherId = (teacherRaw as unknown as { id: string } | null)?.id ?? ''

    const [{ data: sentRaw }, { data: receivedRaw }, { data: classesRaw }] = await Promise.all([
      supabase.from('messages').select('id, content, created_at, recipient:recipient_id(full_name)').eq('sender_id', me.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('messages').select('id, content, created_at, sender:sender_id(full_name)').eq('recipient_id', me.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('classes').select('class_enrollments(students(user_id, users(full_name)))').eq('teacher_id', teacherId),
    ])

    const sent = (sentRaw ?? []) as unknown as Array<{ id: string; content: string; created_at: string; recipient: { full_name: string | null } | null }>
    const received = (receivedRaw ?? []) as unknown as Array<{ id: string; content: string; created_at: string; sender: { full_name: string | null } | null }>

    const combined: FeedItem[] = [
      ...sent.map(m => ({ id: m.id, direction: 'sent' as const, other: m.recipient?.full_name ?? 'Unknown', content: m.content, created_at: m.created_at })),
      ...received.map(m => ({ id: m.id, direction: 'received' as const, other: m.sender?.full_name ?? 'Unknown', content: m.content, created_at: m.created_at })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 40)

    const classes = (classesRaw ?? []) as unknown as Array<{ class_enrollments: Array<{ students: { user_id: string; users: { full_name: string | null } | null } | null }> }>
    const studentMap = new Map<string, string>()
    for (const c of classes) {
      for (const enr of c.class_enrollments ?? []) {
        const s = enr.students
        if (s?.user_id) studentMap.set(s.user_id, s.users?.full_name ?? 'Student')
      }
    }

    setFeed(combined)
    setRecipients([...studentMap.entries()].map(([id, label]) => ({ id, label })))
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleSend() {
    setSending(true)
    setError('')
    // Routed through the message-send edge function (not a direct insert) so
    // the recipient gets a real push/in-app notification of the new message.
    try {
      await messageSend({ recipientId, content })
    } catch (err) {
      setSending(false)
      setError(err instanceof Error ? err.message : 'Failed to send message')
      return
    }
    setSending(false)
    setContent('')
    await load()
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Messages" />

      <Card>
        <Text style={styles.cardTitle}>New Message</Text>
        {recipients.length === 0 ? (
          <EmptyState text="No students enrolled in your classes yet." />
        ) : (
          <>
            <Text style={styles.label}>Recipient</Text>
            <View style={styles.chipRow}>
              {recipients.map(r => (
                <Text key={r.id} onPress={() => setRecipientId(r.id)} style={[chipStyles.chip, recipientId === r.id ? chipStyles.chipActive : null]}>{r.label}</Text>
              ))}
            </View>
            <TextField value={content} onChangeText={setContent} placeholder="Write a message…" multiline />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Send Message" onPress={handleSend} loading={sending} disabled={!recipientId || !content} />
          </>
        )}
      </Card>

      <Text style={styles.sectionLabel}>Recent Conversations</Text>
      {feed.length === 0 ? (
        <EmptyState text="No messages yet." />
      ) : (
        <Card>
          {feed.map(m => (
            <ListRow key={`${m.direction}-${m.id}`}
              title={m.direction === 'sent' ? `You → ${m.other}` : `${m.other} → You`}
              subtitle={m.content} />
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
