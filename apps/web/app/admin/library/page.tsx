import { createClient } from '@/lib/supabase/server'
import LibraryManager from './LibraryManager'

export default async function AdminLibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: resourcesRaw } = await supabase
    .from('library_resources')
    .select('id, title, description, url, category, resource_type, is_published, created_at')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false })

  const resources = (resourcesRaw ?? []) as unknown as Array<{
    id: string; title: string; description: string | null; url: string; category: string; resource_type: string
    is_published: boolean; created_at: string
  }>

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-6">Digital Library</h1>
      <LibraryManager institutionId={institutionId} userId={user!.id} resources={resources} />
    </div>
  )
}
