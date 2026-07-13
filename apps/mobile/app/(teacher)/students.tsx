/**
 * Mirrors apps/web/app/teacher/students (TeacherStudentsPage) — combined
 * roster across all of this teacher's classes.
 */
import { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, ListRow, EmptyState, LoadingView } from '../../components/ui'

type ClassWithRoster = {
  id: string; title: string | null; subjects: { name: string } | null
  class_enrollments: Array<{ students: { id: string; student_number: string; users: { full_name: string | null; email: string } | null } | null }>
}
type RosterEntry = { id: string; name: string; email: string; studentNumber: string; classList: string }

export default function TeacherStudentsScreen() {
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: teacherRaw } = await supabase.from('teachers').select('id').eq('user_id', me.id).single()
    const teacherId = (teacherRaw as unknown as { id: string } | null)?.id ?? ''

    const { data } = await supabase
      .from('classes')
      .select('id, title, subjects(name), class_enrollments(students(id, student_number, users(full_name, email)))')
      .eq('teacher_id', teacherId)

    const classes = (data ?? []) as unknown as ClassWithRoster[]
    const rosterMap = new Map<string, { name: string; email: string; studentNumber: string; classes: Set<string> }>()
    for (const c of classes) {
      const label = c.title || c.subjects?.name || 'Class'
      for (const e of c.class_enrollments ?? []) {
        const s = e.students
        if (!s) continue
        if (!rosterMap.has(s.id)) {
          rosterMap.set(s.id, { name: s.users?.full_name ?? 'Student', email: s.users?.email ?? '', studentNumber: s.student_number, classes: new Set() })
        }
        rosterMap.get(s.id)!.classes.add(label)
      }
    }
    const list = [...rosterMap.entries()].map(([id, v]) => ({ id, name: v.name, email: v.email, studentNumber: v.studentNumber, classList: [...v.classes].join(', ') }))
      .sort((a, b) => a.name.localeCompare(b.name))
    setRoster(list)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Students" subtitle={`Roster (${roster.length})`} />
      {roster.length === 0 ? (
        <EmptyState text="No students enrolled in your classes yet." />
      ) : (
        <Card>
          {roster.map(s => (
            <ListRow key={s.id} title={`${s.name} (${s.studentNumber})`} subtitle={`${s.email} · ${s.classList}`} />
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
})
