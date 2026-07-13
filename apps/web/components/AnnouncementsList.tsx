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
    .select('id, title, body, target_roles, published_at, expires_at')
    .eq('institution_id', institutionId)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(50)

  const now = new Date()
  const announcements = ((announcementsRaw ?? []) as unknown as Array<{
    id: string; title: string; body: string; target_roles: string[] | null; published_at: string | null; expires_at: string | null
  }>).filter(a => (a.target_roles ?? []).includes(role) && (!a.expires_at || new Date(a.expires_at) > now))

  return (
    <div className="card">
      <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">
        Announcements ({announcements.length})
      </h2>
      {announcements.length === 0 ? (
        <p className="text-gray-400 text-sm">No announcements right now.</p>
      ) : (
        <ul className="space-y-4">
          {announcements.map(a => (
            <li key={a.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
              <p className="font-medium text-gray-800">{a.title}</p>
              <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{a.body}</p>
              <p className="text-xs text-gray-400 mt-2">
                {a.published_at ? new Date(a.published_at).toLocaleDateString() : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
