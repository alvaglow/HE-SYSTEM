/**
 * HE-SYSTEM mobile — current-user session helper
 *
 * Every admin/management screen needs the caller's institution_id (to scope
 * queries the same way every web page does) and role (admin vs management
 * see different menu items even though they share one route group — see
 * app/(admin)/index.tsx). Centralized here instead of repeating the same
 * two-query lookup in every screen.
 */
import { supabase } from './supabase'

export type Me = { id: string; institutionId: string; role: string; fullName: string | null }

export async function getMe(): Promise<Me | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users')
    .select('institution_id, role, full_name')
    .eq('id', user.id)
    .single()
  const row = data as unknown as { institution_id: string; role: string; full_name: string | null } | null
  if (!row) return null
  return { id: user.id, institutionId: row.institution_id, role: row.role, fullName: row.full_name }
}
