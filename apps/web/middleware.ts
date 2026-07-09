import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_HOME: Record<string, string> = {
  student:    '/student/dashboard',
  teacher:    '/teacher/dashboard',
  admin:      '/admin/dashboard',
  management: '/management/dashboard',
  partner:    '/partner/dashboard',
  parent:     '/parent/dashboard',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  // AUDIT FIX: /api/health (and any other API route) was falling through to
  // the auth-redirect logic below, so an unauthenticated request — e.g. an
  // uptime monitor with no session cookie — got a 307 redirect to /login
  // instead of the JSON health payload. API routes should return their own
  // status codes, not get redirected like a browser page.
  if (pathname.startsWith('/api/')) {
    return response
  }

  // AUDIT FIX: /auth/signout is a POST-only route handler that every role's
  // logout button submits to. Without this bypass, the role-prefix check
  // further down (pathname must start with `/${role}`) would intercept the
  // request and redirect straight back to the user's dashboard — meaning
  // clicking "Log out" never actually reached the handler that clears the
  // session.
  if (pathname.startsWith('/auth/signout')) {
    return response
  }

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

  const { data: { user } } = await supabase.auth.getUser()

  // AUDIT FIX: /reset-password is reached via Supabase's password-recovery
  // email link, which establishes a temporary (authenticated) recovery
  // session. If it were treated as a normal authenticated route below, the
  // "already logged in -> redirect to role home" logic would bounce the user
  // away before they could ever set a new password. It must stay reachable
  // regardless of auth state, and must not itself trigger a redirect.
  if (pathname.startsWith('/reset-password')) {
    return response
  }

  const isAuthRoute = pathname.startsWith('/login') ||
                      pathname.startsWith('/register') ||
                      pathname.startsWith('/forgot-password')

  // Redirect unauthenticated users to login
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Already logged in — redirect away from auth pages
  if (user && isAuthRoute) {
    const { data } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    const home = ROLE_HOME[data?.role ?? ''] ?? '/login'
    return NextResponse.redirect(new URL(home, request.url))
  }

  if (user) {
    const { data } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    const role = data?.role
    if (role) {
      const allowedPrefix = `/${role}`
      if (!pathname.startsWith(allowedPrefix) && !isAuthRoute) {
        return NextResponse.redirect(new URL(ROLE_HOME[role]!, request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
