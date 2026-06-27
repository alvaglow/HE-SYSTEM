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
