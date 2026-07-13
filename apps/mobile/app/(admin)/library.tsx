/**
 * Mirrors apps/web/app/admin/library (LibraryManager) — shared by admin and
 * management roles, same as the rest of this route group.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, Badge, EmptyState, LoadingView, PrimaryButton, TextField } from '../../components/ui'

type Resource = {
  id: string; title: string; description: string | null; url: string; category: string; resource_type: string
  is_published: boolean; created_at: string
}

const CATEGORIES = ['general', 'ebooks', 'journals', 'past-papers', 'guides', 'software']
const RESOURCE_TYPES = ['link', 'pdf', 'ebook', 'database']

export default function LibraryManagerScreen() {
  const [institutionId, setInstitutionId] = useState('')
  const [userId, setUserId] = useState('')
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('general')
  const [resourceType, setResourceType] = useState('link')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setInstitutionId(me.institutionId)
    setUserId(me.id)

    const { data } = await supabase
      .from('library_resources')
      .select('id, title, description, url, category, resource_type, is_published, created_at')
      .eq('institution_id', me.institutionId)
      .order('created_at', { ascending: false })

    setResources((data ?? []) as unknown as Resource[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleCreate() {
    setSubmitting(true)
    setError('')
    const { error } = await supabase.from('library_resources').insert({
      institution_id: institutionId, created_by: userId,
      title, description: description || null, url, category, resource_type: resourceType,
      is_published: true,
    } as unknown as never)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    setTitle(''); setDescription(''); setUrl(''); setCategory('general'); setResourceType('link'); setOpen(false)
    await load()
  }

  async function togglePublish(r: Resource) {
    await supabase.from('library_resources').update({ is_published: !r.is_published } as unknown as never).eq('id', r.id)
    await load()
  }

  async function remove(id: string) {
    await supabase.from('library_resources').delete().eq('id', id)
    await load()
  }

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Digital Library" />

      {!open ? (
        <PrimaryButton label="+ Add Resource" onPress={() => setOpen(true)} />
      ) : (
        <Card>
          <Text style={styles.cardTitle}>New Library Resource</Text>
          <TextField value={title} onChangeText={setTitle} placeholder="Title" />
          <TextField value={url} onChangeText={setUrl} placeholder="https://…" />
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map(c => (
              <Text key={c} onPress={() => setCategory(c)} style={[chipStyles.chip, category === c ? chipStyles.chipActive : null]}>{c}</Text>
            ))}
          </View>
          <Text style={styles.label}>Type</Text>
          <View style={styles.chipRow}>
            {RESOURCE_TYPES.map(t => (
              <Text key={t} onPress={() => setResourceType(t)} style={[chipStyles.chip, resourceType === t ? chipStyles.chipActive : null]}>{t}</Text>
            ))}
          </View>
          <TextField value={description} onChangeText={setDescription} placeholder="Description (optional)" multiline />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Add Resource" onPress={handleCreate} loading={submitting} disabled={!title || !url} />
          <Text onPress={() => setOpen(false)} style={styles.cancelLink}>Cancel</Text>
        </Card>
      )}

      <Text style={styles.sectionLabel}>All Resources ({resources.length})</Text>
      {resources.length === 0 ? (
        <EmptyState text="No library resources added yet." />
      ) : (
        resources.map(r => (
          <Card key={r.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Badge label={r.category} />
                  <Text style={styles.resTitle}>{r.title}</Text>
                </View>
                {r.description && <Text style={styles.resDesc}>{r.description}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text onPress={() => togglePublish(r)} style={styles.actionLink}>{r.is_published ? 'Unpublish' : 'Publish'}</Text>
                <Text onPress={() => remove(r.id)} style={[styles.actionLink, { color: colors.red }]}>Delete</Text>
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
  resTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  resDesc: { fontSize: 13, color: colors.gray, marginTop: 4 },
  actionLink: { fontSize: 12, color: colors.blue, fontWeight: '600' },
})
