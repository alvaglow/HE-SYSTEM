// Frontend API client — apps/web/src/lib/api.js
//
// FIXED: this file used to point at a standalone Express API on
// localhost:4000 and read its auth token from localStorage. That server
// doesn't exist in this app — it was left over from the archived
// "HP SYSTEM" build (see /archive) — so every call here silently failed,
// and the localStorage-token pattern conflicted with how auth actually
// works in this app (Supabase Auth via @supabase/ssr cookies, see
// lib/supabase/client.ts and lib/supabase/server.ts).
//
// This file is kept only so nothing breaks if some other code still imports
// from 'src/lib/api' by path. For new code, prefer:
//   - lib/supabase/client.ts / server.ts for auth and direct table queries
//   - lib/edgeFunctions.ts for calling Supabase Edge Functions
//   (both live at apps/web/lib/, not apps/web/src/lib/)

import { createClient } from '../../lib/supabase/client'

// Generic authenticated request helper, now pointed at Supabase (there is no
// separate Express API in this app) and using the real session token instead
// of a localStorage value nothing ever wrote.
export async function apiRequest(path, options = {}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const url = path.startsWith('http') ? path : `${base}${path}`

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...options.headers,
    },
  }

  const response = await fetch(url, config)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  return response.json()
}

// Auth now goes through Supabase Auth directly, not a custom /auth/* API.
export const authApi = {
  login: ({ email, password }) => createClient().auth.signInWithPassword({ email, password }),
  register: ({ email, password, ...meta }) => createClient().auth.signUp({ email, password, options: { data: meta } }),
  refresh: () => createClient().auth.refreshSession(),
  logout: () => createClient().auth.signOut(),
}
