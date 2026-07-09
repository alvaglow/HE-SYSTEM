import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@he-system/database'

// PILOT-LAUNCH HARDENING: the Supabase JS client has no built-in "onError"
// hook. A write denied by RLS (INSERT/UPDATE/DELETE) resolves as a normal-
// looking PostgREST 401/403 response that's easy to miss if the caller
// doesn't check `error` on every single call, and a read that RLS silently
// filters down to zero rows looks identical to "there's just no data."
// Wrapping the client's fetch means every access-denied or server-error
// response is logged loudly with its URL, so an empty dashboard has a
// console line pointing at "this was an RLS/auth problem" instead of no
// signal at all.
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

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: loggingFetch } }
  )
}
