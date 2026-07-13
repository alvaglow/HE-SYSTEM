/**
 * Mirrors apps/web/app/student/directory (StudentDirectoryPage + DirectoryList).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { colors, ScreenHeader, Card, Badge, TextField, EmptyState, LoadingView } from '../../components/ui'

type Entry = { userId: string; name: string; email: string; role: 'teacher' | 'staff'; departmentName: string | null; detail: string | null }

export default function DirectoryScreen() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [{ data: teachersRaw }, { data: staffRaw }] = await Promise.all([
      supabase.from('teachers').select('user_id, specializations, users(full_name, email), departments(name)'),
      supabase.from('staff').select('user_id, position, users(full_name, email), departments(name)'),
    ])

    const teachers = ((teachersRaw ?? []) as unknown as Array<{
      user_id: string; specializations: string[] | null; users: { full_name: string | null; email: string } | null; departments: { name: string } | null
    }>).map(t => ({
      userId: t.user_id, name: t.users?.full_name ?? 'Unknown', email: t.users?.email ?? '', role: 'teacher' as const,
      departmentName: t.departments?.name ?? null, detail: t.specializations?.length ? t.specializations.join(', ') : null,
    }))

    const staff = ((staffRaw ?? []) as unknown as Array<{
      user_id: string; position: string | null; users: { full_name: string | null; email: string } | null; departments: { name: string } | null
    }>).map(s => ({
      userId: s.user_id, name: s.users?.full_name ?? 'Unknown', email: s.users?.email ?? '', role: 'staff' as const,
      departmentName: s.departments?.name ?? null, detail: s.position ?? null,
    }))

    setEntries([...teachers, ...staff].sort((a, b) => a.name.localeCompare(b.name)))
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  const filtered = entries.filter(e => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return e.name.toLowerCase().includes(q) || (e.departmentName ?? '').toLowerCase().includes(q) || (e.detail ?? '').toLowerCase().includes(q)
  })

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Staff Directory" />
      <TextField value={query} onChangeText={setQuery} placeholder="Search by name, department…" />

      {filtered.length === 0 ? (
        <EmptyState text="No matching staff or lecturers found." />
      ) : (
        <Card>
          {filtered.map(e => (
            <View key={e.userId} style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{e.name.charAt(0).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.name}>{e.name}</Text>
                    <Badge label={e.role === 'teacher' ? 'Lecturer' : 'Staff'} />
                  </View>
                  {e.departmentName && <Text style={styles.sub}>{e.departmentName}</Text>}
                  {e.detail && <Text style={styles.sub}>{e.detail}</Text>}
                </View>
              </View>
              <Text
                style={styles.messageLink}
                onPress={() => router.push({ pathname: '/(student)/messages', params: { to: e.userId, name: e.name } })}
              >
                Message
              </Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: colors.blue },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  sub: { fontSize: 12, color: colors.gray, marginTop: 2 },
  messageLink: { fontSize: 12, fontWeight: '600', color: colors.blue, marginLeft: 8 },
})
