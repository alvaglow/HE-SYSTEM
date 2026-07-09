/**
 * HE-SYSTEM — useAuth hook (client-side)
 * Provides current user + role from Supabase Auth.
 *
 * AUDIT FIX: this used to import a Supabase client via a relative path that
 * reached up into apps/web specifically (`../../../apps/web/lib/supabase/client`),
 * which meant it would break the moment it was used from apps/mobile (or any
 * other consumer) — a shared package should never depend on one specific
 * app's internals. It also wasn't imported anywhere yet. Now it builds its
 * own minimal browser client directly with @supabase/supabase-js, so it's
 * genuinely usable from both apps/web and apps/mobile.
 */
import { useEffect, useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '../types/index'

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!client) {
    // Works in both Next.js (NEXT_PUBLIC_*) and Expo (EXPO_PUBLIC_*) — whichever
    // is present in the consuming app's bundled env.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
    client = createClient(url, anonKey)
  }
  return client
}

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        const { data } = await supabase
          .from('users').select('role').eq('id', user.id).single()
        setRole((data?.role as UserRole) ?? null)
      }
      setLoading(false)
    })
  }, [])

  const signOut = () => getClient().auth.signOut()

  return { userId, role, loading, signOut }
}
