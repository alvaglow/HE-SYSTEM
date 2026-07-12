import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@he-system/database'

// PILOT-LAUNCH HARDENING: same rationale as lib/supabase/client.ts — surface
// RLS/auth denials and server errors loudly in server-side logs (visible in
// `supabase functions logs` / Vercel logs) instead of a dashboard silently
// rendering with zero rows and no indication why.
function loggingFetch(...args: Parameters<typeof fetch>): Promise<Response> {
  const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request | URL).toString()
  return fetch(...args)
    .then((res) => {
      if (res.status === 401 || res.status === 403) {
        console.error(`[Supabase] Access denied (${res.status}) on ${url} — check auth session and RLS policies`)
      } else if (res.status >= 500) {
        console.error(`[Supabase] Server error (${res.status}) on ${url}`)
      }
      return res
    })
    .catch((err) => {
      console.error(`[Supabase] Network error calling ${url}:`, err)
      throw err
    })
}

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch { /* called from Server Component — ignore */ }
        },
      },
      global: { fetch: loggingFetch },
    }
  )
}
