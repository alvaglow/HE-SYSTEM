/**
 * Mirrors apps/web/app/teacher/timetable (TeacherTimetablePage).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, Linking, TouchableOpacity } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, EmptyState, LoadingView } from '../../components/ui'

type ClassRow = {
  id: string; title: string | null; starts_at: string; ends_at: string; class_type: string
  location_name: string | null; room_number: string | null; join_url: string | null
  subjects: { name: string } | null
}

export default function TeacherTimetableScreen() {
  const [byDay, setByDay] = useState<Array<[string, ClassRow[]]>>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: teacherRaw } = await supabase.from('teachers').select('id').eq('user_id', me.id).single()
    const teacherId = (teacherRaw as unknown as { id: string } | null)?.id ?? ''

    const nowIso = new Date().toISOString()
    const { data } = await supabase
      .from('classes')
      .select('id, title, starts_at, ends_at, class_type, location_name, room_number, join_url, subjects(name)')
      .eq('teacher_id', teacherId)
      .eq('is_cancelled', false)
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true })
      .limit(50)

    const classes = (data ?? []) as unknown as ClassRow[]
    const grouped = new Map<string, ClassRow[]>()
    for (const c of classes) {
      const day = new Date(c.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      if (!grouped.has(day)) grouped.set(day, [])
      grouped.get(day)!.push(c)
    }
    setByDay([...grouped.entries()])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Timetable" />
      {byDay.length === 0 ? (
        <EmptyState text="No upcoming classes scheduled." />
      ) : (
        byDay.map(([day, dayClasses]) => (
          <Card key={day}>
            <Text style={styles.dayLabel}>{day}</Text>
            {dayClasses.map(c => (
              <View key={c.id} style={styles.classRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.classTitle}>{c.title || c.subjects?.name || 'Class'}</Text>
                  <Text style={styles.classSub}>{c.class_type === 'remote' ? 'Online' : (c.location_name || c.room_number || 'On campus')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.classTime}>
                    {new Date(c.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    {' – '}
                    {new Date(c.ends_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                  {c.class_type === 'remote' && c.join_url && (
                    <TouchableOpacity onPress={() => Linking.openURL(c.join_url!)}>
                      <Text style={styles.joinLink}>Join link</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  dayLabel: { fontSize: 13, fontWeight: '700', color: colors.blue, marginBottom: 10 },
  classRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  classTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  classSub: { fontSize: 12, color: colors.gray, marginTop: 2 },
  classTime: { fontSize: 13, color: colors.text },
  joinLink: { fontSize: 12, color: colors.blue, marginTop: 2 },
})
