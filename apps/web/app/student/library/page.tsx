import { createClient } from '@/lib/supabase/server'
import LibraryBrowser from './LibraryBrowser'

export default async function StudentLibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: resourcesRaw } = await supabase
    .from('library_resources')
    .select('id, title, description, url, category, resource_type, created_at')
    .eq('institution_id', institutionId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  const resources = (resourcesRaw ?? []) as unknown as Array<{
    id: string; title: string; description: string | null; url: string; category: string; resource_type: string; created_at: string
  }>

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-6">Digital Library</h1>
      <LibraryBrowser resources={resources} />
    </div>
  )
}
