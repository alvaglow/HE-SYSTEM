import { createClient } from '@/lib/supabase/server'
import DirectoryList from './DirectoryList'

export type DirectoryEntry = {
  userId: string; name: string; email: string; role: 'teacher' | 'staff'
  departmentName: string | null; detail: string | null
}

export default async function StudentDirectoryPage() {
  const supabase = await createClient()

  const [{ data: teachersRaw }, { data: staffRaw }] = await Promise.all([
    supabase.from('teachers').select('user_id, specializations, users(full_name, email), departments(name)'),
    supabase.from('staff').select('user_id, position, users(full_name, email), departments(name)'),
  ])

  const teachers = ((teachersRaw ?? []) as unknown as Array<{
    user_id: string; specializations: string[] | null; users: { full_name: string | null; email: string } | null; departments: { name: string } | null
  }>).map(t => ({
    userId: t.user_id, name: t.users?.full_name ?? 'Unknown', email: t.users?.email ?? '', role: 'teacher' as const,
    departmentName: t.departments?.name ?? null, detail: t.specializations?.length ? t.specializations.join(', ') : null,
  }))

  const staff = ((staffRaw ?? []) as unknown as Array<{
    user_id: string; position: string | null; users: { full_name: string | null; email: string } | null; departments: { name: string } | null
  }>).map(s => ({
    userId: s.user_id, name: s.users?.full_name ?? 'Unknown', email: s.users?.email ?? '', role: 'staff' as const,
    departmentName: s.departments?.name ?? null, detail: s.position ?? null,
  }))

  const entries: DirectoryEntry[] = [...teachers, ...staff].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Staff Directory</h1>
      <DirectoryList entries={entries} />
    </div>
  )
}
