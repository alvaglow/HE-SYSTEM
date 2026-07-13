/**
 * Mirrors apps/web/app/student/library (LibraryBrowser) — read-only view of
 * published library_resources for the student's institution.
 */
import { useCallback, useMemo, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, Linking } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, Badge, TextField, EmptyState, LoadingView } from '../../components/ui'

type Resource = {
  id: string; title: string; description: string | null; url: string; category: string; resource_type: string; created_at: string
}

const TYPE_ICONS: Record<string, string> = { link: '🔗', pdf: '📄', ebook: '📚', database: '🗄️' }

export default function StudentLibraryScreen() {
  const [resources, setResources] = useState<Resource[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data } = await supabase
      .from('library_resources')
      .select('id, title, description, url, category, resource_type, created_at')
      .eq('institution_id', me.institutionId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    setResources((data ?? []) as unknown as Resource[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  const categories = ['all', ...Array.from(new Set(resources.map(r => r.category)))]
  const filtered = resources.filter(r => {
    if (category !== 'all' && r.category !== category) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return r.title.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q)
  })

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Digital Library" />
      <TextField value={query} onChangeText={setQuery} placeholder="Search resources…" />

      <View style={styles.chipRow}>
        {categories.map(c => (
          <Text key={c} onPress={() => setCategory(c)} style={[chipStyles.chip, category === c ? chipStyles.chipActive : null]}>
            {c === 'all' ? 'All' : c}
          </Text>
        ))}
      </View>

      {filtered.length === 0 ? (
        <EmptyState text="No resources found." />
      ) : (
        <Card>
          {filtered.map(r => (
            <View key={r.id} style={styles.row}>
              <Text style={styles.icon}>{TYPE_ICONS[r.resource_type] ?? '🔗'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.resTitle} onPress={() => Linking.openURL(r.url)}>{r.title}</Text>
                {r.description && <Text style={styles.resDesc}>{r.description}</Text>}
                <View style={{ marginTop: 6, flexDirection: 'row' }}><Badge label={r.category} /></View>
              </View>
            </View>
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  icon: { fontSize: 22 },
  resTitle: { fontSize: 14, fontWeight: '600', color: colors.blue },
  resDesc: { fontSize: 12, color: colors.gray, marginTop: 2 },
})
