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
}

const ALL_ROLES = ['student', 'teacher', 'admin', 'management', 'partner', 'parent']

export default function AnnouncementsScreen() {
  const [institutionId, setInstitutionId] = useState('')
  const [userId, setUserId] = useState('')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
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
      .select('id, title, body, target_roles, is_published, published_at, created_at')
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
      target_roles: roles, is_published: true, published_at: new Date().toISOString(),
    } as unknown as never)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    setTitle(''); setBody(''); setRoles(ALL_ROLES); setOpen(false)
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
                <Text style={styles.annTitle}>{a.title}</Text>
                <Text style={styles.annBody}>{a.body}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {(a.target_roles ?? []).map(r => <Badge key={r} label={r} />)}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text onPress={() => togglePublish(a)} style={styles.actionLink}>{a.is_published ? 'Unpublish' : 'Publish'}</Text>
                <Text onPress={() => remove(a.id)} style={[styles.actionLink, { color: colors.red }]}>Delete</Text>
              </View>
            </View>
          </Card>
        ))
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
  annTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  annBody: { fontSize: 13, color: colors.gray, marginTop: 4 },
  actionLink: { fontSize: 12, color: colors.blue, fontWeight: '600' },
})
