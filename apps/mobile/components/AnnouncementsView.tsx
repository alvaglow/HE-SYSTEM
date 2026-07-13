/**
 * Shared read-only announcements view for student/parent/teacher mobile
 * portals — mirrors apps/web/components/AnnouncementsList.tsx. Admin already
 * has a full create/publish/delete screen at (admin)/announcements.tsx; this
 * is the missing other half: surfacing published announcements to the roles
 * they're targeted at. RLS already allows any user in the institution to
 * read published rows, so target_roles/expires_at filtering happens here.
 */
import { useCallback, useState } from 'react'
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../lib/supabase'
import { getMe } from '../lib/session'
import { colors, ScreenHeader, Card, Badge, EmptyState, LoadingView } from './ui'

type Announcement = {
  id: string; title: string; body: string; target_roles: string[] | null; published_at: string | null; expires_at: string | null
  category: string; event_date: string | null
}

const CATEGORY_LABELS: Record<string, string> = { news: 'News', event: 'Event', academic: 'Academic', urgent: 'Urgent' }

export default function AnnouncementsView({ role }: { role: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data } = await supabase
      .from('announcements')
      .select('id, title, body, target_roles, published_at, expires_at, category, event_date')
      .eq('institution_id', me.institutionId)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(50)

    const now = new Date()
    const rows = ((data ?? []) as unknown as Announcement[])
      .filter(a => (a.target_roles ?? []).includes(role) && (!a.expires_at || new Date(a.expires_at) > now))
    setAnnouncements(rows)
    setLoading(false)
  }, [role])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  const now = new Date()
  const upcomingEvents = announcements
    .filter(a => a.category === 'event' && a.event_date && new Date(a.event_date) >= now)
    .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime())

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Announcements" />

      {upcomingEvents.length > 0 && (
        <Card>
          <Text style={styles.sectionLabel}>Upcoming Events ({upcomingEvents.length})</Text>
          {upcomingEvents.map(a => (
            <View key={a.id} style={styles.item}>
              <Text style={styles.itemTitle}>{a.title}</Text>
              <Text style={styles.itemBody}>{a.body}</Text>
              <Text style={styles.eventDate}>📅 {new Date(a.event_date!).toLocaleString()}</Text>
            </View>
          ))}
      