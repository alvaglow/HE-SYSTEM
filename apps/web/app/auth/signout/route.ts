/**
 * AUDIT FIX: the student layout's logout button posts to /auth/signout, but
 * no route existed there (404) — so signing out silently failed, leaving
 * the user's session cookie in place. This is the real handler: it clears
 * the Supabase session server-side and redirects to /login.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options))
        },
      },
    }
  )

  await supabase.auth.signOut()

  return response
}
