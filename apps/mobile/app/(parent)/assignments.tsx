/**
 * Mirrors apps/web/app/parent/assignments (ParentAssignmentsPage).
 */
import { useCallback, useState } from 'react'
import { Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView } from '../../components/ui'

type Assignment = { id: string; title: string; due_at: string | null; max_score: number; classes: { title: string | null; subjects: { name: string } | null } | null }
type Sub = { assignment_id: string; score: number | null; graded_at: string | null }
type ChildBlock = { id: string; name: string; subs: Map<string, Sub> }

export default function ParentAssignmentsScreen() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [blocks, setBlocks] = useState<ChildBlock[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const [{ data: linksRaw }, { data: assignmentsRaw }] = await Promise.all([
      supabase.from('parent_student_links').select('students(id, users(full_name))').eq('parent_user_id', me.id),
      supabase.from('assignments').select('id, title, due_at, max_score, classes(title, subjects(name))').order('due_at', { ascending: true, nullsFirst: false }),
    ])
    setAssignments((assignmentsRaw ?? []) as unknown as Assignment[])

    const links = (linksRaw ?? []) as unknown as Array<{ students: { id: string; users: { full_name: string | null } | null } | null }>
    const children = links.map(l => l.students).filter((s): s is { id: string; users: { full_name: string | null } | null } => !!s)

    const results = await Promise.all(children.map(async child => {
      const { data: subsRaw } = await supabase.from('assignment_submissions').select('assignment_id, score, graded_at').eq('student_id', child.id)
      const subs = (subsRaw ?? []) as unknown as Sub[]
      return { id: child.id, name: child.users?.full_name ?? 'Child', subs: new Map(subs.map(s => [s.assignment_id, s])) }
    }))
    setBlocks(results)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Assignments" />
      {blocks.length === 0 ? (
        <EmptyState text="No children linked to your account yet. Contact admin." />
      ) : (
        blocks.map(b => (
          <Card key={b.id}>
            <Text style={styles.childHeader}>{b.name}</Text>
            {assignments.length === 0 ? (
              <EmptyState text="No assignments yet." />
            ) : (
              assignments.map(a => {
                const sub = b.subs.get(a.id)
                return (
                  <ListRow key={a.id}
                    title={a.title}
                    subtitle={`${a.classes?.title || a.classes?.subjects?.name || 'Class'}${a.due_at ? ` · Due ${new Date(a.due_at).toLocaleString()}` : ''}`}
                    right={<Badge label={sub?.graded_at ? `${sub.score}/${a.max_score}` : sub ? 'SUBMITTED' : 'NOT SUBMITTED'} status={sub?.graded_at ? 'approved' : sub ? 'pending' : 'draft'} />} />
                )
              })
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
