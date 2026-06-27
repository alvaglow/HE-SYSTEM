/**
 * HE-SYSTEM — useAuth hook (client-side)
 * Provides current user + role from Supabase Auth
 */
import { useEffect, useState } from 'react'
import { createClient } from '../../../apps/web/lib/supabase/client'
import type { UserRole } from '../types/index'

export function useAuth() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        const { data } = await supabase
          .from('users').select('role').eq('id', user.id).single()
        setRole(data?.role ?? null)
      }
      setLoading(false)
    })
  }, [])

  const signOut = () => supabase.auth.signOut()

  return { userId, role, loading, signOut }
}
