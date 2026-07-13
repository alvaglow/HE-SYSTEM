/**
 * Mirrors apps/web/app/admin/announcements (AnnouncementsManager).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Announcement = {
  id: string; title: string; body: string
  target_roles: string[] | null; is_published: boolean | null
  published_at: string | null; created_at: string
  category: string; event_date: string | null
}

const ALL_ROLES = ['student', 'teacher', 'admin', 'management', 'partner', 'parent']
const CATEGORIES = ['news', 'event', 'academic', 'urgent']
const CATEGORY_LABELS: Record<string, string> = { news: 'News', event: 'Event', academic: 'Academic', urgent: 'Urgent' }

export default function AnnouncementsScreen() {
  const [institutionId, setInstitutionId] = useState('')
  const [userId, setUserId] = useState('')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('news')
  const [eventDate, setEventDate] = useState('')
  const [roles, setRoles] = useState<string[]>(ALL_ROLES)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)
    setUserId(me.id)

    const { data } = await supabase
      .from('announcements')
      .select('id, title, body, target_roles, is_published, published_at, created_at, category, event_date')
      .eq('institution_id', me.institutionId)
      .order('created_at', { ascending: false })

    setAnnouncements((data ?? []) as unknown as Announcement[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function toggleRole(r: string) {
    setRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
  }

  async function handleCreate() {
    setSubmitting(true)
    setError('')
    const { error } = await supabase.from('announcements').insert({
      institution_id: institutionId, created_by: userId, title, body,
      category, event_date: category === 'event' && eventDate ? new Date(eventDate).toISOString() : null,
      target_roles: roles, is_published: true, published_at: new Date().toISOString(),
    } as unknown as never)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    setTitle(''); setBody(''); setCategory('news'); setEventDate(''); setRoles(ALL_ROLES); setOpen(false)
    await load()
  }

  async function togglePublish(a: Announcement) {
    await supabase.from('announcements').update({
      is_published: !a.is_published,
      published_at: !a.is_published ? new Date().toISOString() : a.published_at,
    } as unknown as never).eq('id', a.id)
    await load()
  }

  async function remove(id: string) {
    await supabase.from('announcements').delete().eq('id', id)
    await load()
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Announcements" />

      {!open ? (
        <PrimaryButton label="+ New Announcement" onPress={() => setOpen(true)} />
      ) : (
        <Card>
          <Text style={styles.cardTitle}>New Announcement</Text>
          <TextField value={title} onChangeText={setTitle} placeholder="Title" />
          <TextField value={body} onChangeText={setBody} placeholder="Message" multiline />
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map(c => (
              <Text key={c} onPress={() => setCategory(c)} style={[chipStyles.chip, category === c ? chipStyles.chipActive : null]}>{CATEGORY_LABELS[c]}</Text>
            ))}
          </View>
          {category === 'event' && (
            <TextField value={eventDate} onChangeText={setEventDate} placeholder="Event date/time (YYYY-MM-DD HH:mm)" />
          )}
          <Text style={styles.label}>Visible to</Text>
          <View style={styles.chipRow}>
            {ALL_ROLES.map(r => (
              <Text key={r} onPress={() => toggleRole(r)} style={[chipStyles.chip, roles.includes(r) ? chipStyles.chipActive : null]}>{r}</Text>
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Publish Announcement" onPress={handleCreate} loading={submitting} disabled={!title || !body} />
          <Text onPress={() => setOpen(false)} style={styles.cancelLink}>Cancel</Text>
        </Card>
      )}

      <Text style={styles.sectionLabel}>All Announcements ({announcements.length})</Text>
      {announcements.length === 0 ? (
        <EmptyState text="No announcements yet." />
      ) : (
        announcements.map(a => (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Badge label={CATEGORY_LABELS[a.category] ?? 'News'} />
                  <Text style={styles.annTitle}>{a.title}</Text>
                </View>
                <Text style={styles.annBody}>{a.body}</Text>
                {a.event_date && <Text style={styles.eventDate}>📅 {new Date(a.event_date).toLocaleString()}</Text>}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {(a.target_roles ?? []).map(r => <Badge key={r} label={r} />)}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text onPress={() => togglePublish(a)} style={styles.actionLink}>{a.is_published ? 'Unpublish' : 'Publish'}</Text>
                <Text onPress={() => remove(a.id)} style={[styl