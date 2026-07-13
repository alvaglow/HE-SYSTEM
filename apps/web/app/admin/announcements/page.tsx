import { createClient } from '@/lib/supabase/server'
import AnnouncementsManager from './AnnouncementsManager'

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: announcementsRaw } = await supabase
    .from('announcements')
    .select('id, title, body, target_roles, is_published, published_at, created_at, category, event_date')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false })

  const announcements = (announcementsRaw ?? []) as unknown as Array<{
    id: string; title: string; body: string
    target_roles: string[] | null; is_published: boolean | null
    published_at: string | null; created_at: string
    category: string; event_date: string | null
  }>

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-6">Announcements</h1>
      <AnnouncementsManager institutionId={institutionId