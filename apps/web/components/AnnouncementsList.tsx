import { createClient } from '@/lib/supabase/server'

// Shared read-only announcements view for student/parent/teacher portals.
// Admin already has a full create/publish/delete UI at /admin/announcements
// (AnnouncementsManager) — this component is the missing other half: actually
// surfacing published announcements to the roles they're targeted at. RLS
// already allows any user in the institution to read published rows
// (`announcements: read published` policy checks institution + is_published
// only), so the target_roles and expires_at filtering happens here.
export default async function AnnouncementsList({ role }: { role: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: announcementsRaw } = await supabase
    .from('announcements')
    .select('id, title, body, target_roles, published_at, expires_at, category, event_date')
    .eq('institution_id', institutionId)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(50)

  const now = new Date()
  const announcements = ((announcementsRaw ?? []) as unknown as Array<{
    id: string; title: string; body: string; target_roles: string[] | null; published_at: string | null; expires_at: string | null
    category: string; event_date: string | null
  }>).filter(a => (a.target_roles ?? []).includes(role) && (!a.expires_at || new Date(a.expires_at) > now))

  const CATEGORY_STYLES: Record<string, string> = {
    news: 'bg-blue-50 text-brand-blue', event: 'bg-purple-50 text-purple-700',
    academic: 'bg-green-50 text-green-700', urgent: 'bg-red-50 text-brand-red',
  }
  const CATEGORY_LABELS: Record<string, string> = { news: 'News', event: 'Event', academic: 'Academic', urgent: 'Urgent' }

  // Upcoming events (category='event' with a future event_date) surfaced separately,
  // similar in spirit to a portal's "News & Updates" split between general news and
  // things worth marking on a calendar.
  const upcomingEvents = announcements
    .filter(a => a.category === 'event' && a.event_date && new Date(a.event_date) >= now)
    .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime())

  return (
    <d