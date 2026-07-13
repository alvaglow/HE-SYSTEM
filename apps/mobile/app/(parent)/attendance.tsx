/**
 * Mirrors apps/web/app/parent/attendance (ParentAttendancePage).
 */
import { useCallback, useState } from 'react'
import { Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView } from '../../components/ui'

type Record_ = {
  id: string; status: string; marked_at: string | null
  classes: { title: string | null; subjects: { name: string } | null } | null
}
type ChildBlock = { id: string; name: string; records: Record_[]; pct: number | null }

export default function ParentAttendanceScreen() {
  const [blocks, setBlocks] = useState<ChildBlock[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: linksRaw } = await supabase
      .from('parent_student_links')
      .select('students(id, users(full_name))')
      .eq('parent_user_id', me.id)
    const links = (linksRaw ?? []) as unknown as Array<{ students: { id: string; users: { full_name: string | null } | null } | null }>
    const children = links.map(l => l.students).filter((s): s is { id: string; users: { full_name: string | null } | null } => !!s)

    const results = await Promise.all(children.map(async child => {
      const { data: recordsRaw } = await supabase
        .from('attendance_records')
        .select('id, status, marked_at, classes(title, subjects(name))')
        .eq('student_id', child.id)
        .order('marked_at', { ascending: false })
        .limit(50)
      const records = (recordsRaw ?? []) as unknown as Record_[]
      const total = records.length
      const present = records.filter(r => r.status === 'present' || r.status === 'late').length
      const pct = total > 0 ? Math.round((present / total) * 100) : null
      return { id: child.id, name: child.users?.full_name ?? 'Child', records, pct }
    }))

    setBlocks(results)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Attendance" />
      {blocks.length === 0 ? (
        <EmptyState text="No children linked to your account yet. Contact admin." />
      ) : (
        blocks.map(b => (
          <Card key={b.id}>
            <Text style={styles.childHeader}>{b.name} · {b.pct != null ? `${b.pct}% attendance` : 'No records yet'}</Text>
            {b.records.length === 0 ? (
              <EmptyState text="No attendance records yet." />
            ) : (
              b.records.map(r => (
                <ListRow key={r.id} title={r.classes?.title || r.classes?.subjects?.name || '—'}
                  subtitle={r.marked_at ? new Date(r.marked_at).toLocaleString() : '—'}
                  right={<Badge label={r.status.toUpperCase()} status={r.status} />} />
              ))
            )}
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  childHeader: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
})
