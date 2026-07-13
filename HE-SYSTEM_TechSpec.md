# HE-SYSTEM — Full Technical Specification
*Version 1.0 — June 2026*

---

## 1. Project Structure

```
HED_SYSTEM/                             ← Turborepo monorepo root
├── apps/
│   ├── web/                            ← Next.js 14 (App Router)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/page.tsx
│   │   │   ├── (student)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── attendance/page.tsx
│   │   │   │   ├── timetable/page.tsx
│   │   │   │   ├── results/page.tsx
│   │   │   │   ├── fees/page.tsx
│   │   │   │   ├── wallet/page.tsx
│   │   │   │   ├── location/page.tsx
│   │   │   │   └── messages/page.tsx
│   │   │   ├── (teacher)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── kpi/page.tsx
│   │   │   │   ├── attendance/page.tsx
│   │   │   │   ├── grades/page.tsx
│   │   │   │   ├── timetable/page.tsx
│   │   │   │   ├── students/page.tsx
│   │   │   │   └── leave/page.tsx
│   │   │   ├── (admin)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── students/page.tsx
│   │   │   │   ├── staff/page.tsx
│   │   │   │   ├── enrolment/page.tsx
│   │   │   │   ├── invoices/page.tsx
│   │   │   │   ├── partners/page.tsx
│   │   │   │   ├── timetable/page.tsx
│   │   │   │   └── announcements/page.tsx
│   │   │   ├── (management)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── kpi/page.tsx
│   │   │   │   ├── finance/page.tsx
│   │   │   │   ├── partners/page.tsx
│   │   │   │   ├── enrolment/page.tsx
│   │   │   │   └── reports/page.tsx
│   │   │   ├── (partner)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── students/page.tsx
│   │   │   │   ├── commission/page.tsx
│   │   │   │   ├── payouts/page.tsx
│   │   │   │   ├── leaderboard/page.tsx
│   │   │   │   └── profile/page.tsx
│   │   │   ├── (parent)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── attendance/page.tsx
│   │   │   │   ├── results/page.tsx
│   │   │   │   ├── fees/page.tsx
│   │   │   │   ├── location/page.tsx
│   │   │   │   └── messages/page.tsx
│   │   │   ├── api/auth/callback/route.ts
│   │   │   └── layout.tsx
│   │   ├── middleware.ts               ← RBAC route protection
│   │   ├── lib/
│   │   │   ├── supabase/client.ts
│   │   │   ├── supabase/server.ts
│   │   │   └── i18n/en.json + vi.json
│   │   ├── public/
│   │   │   ├── HE-SYSTEM_Logo.svg
│   │   │   └── HE-SYSTEM_Icon.svg
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   └── mobile/                        ← Expo React Native
│       ├── app/
│       │   ├── (auth)/login.tsx
│       │   ├── (student)/
│       │   ├── (teacher)/
│       │   ├── (admin)/
│       │   ├── (partner)/
│       │   ├── (parent)/
│       │   └── _layout.tsx
│       ├── lib/supabase.ts
│       ├── app.json
│       └── tsconfig.json
│
├── packages/
│   ├── shared/
│   │   ├── utils/
│   │   │   ├── commission-formula.ts   ← ✅ Written
│   │   │   ├── kpi-calculator.ts       ← ✅ Written
│   │   │   └── format.ts
│   │   ├── hooks/useAuth.ts
│   │   ├── types/index.ts
│   │   └── package.json
│   │
│   └── database/
│       ├── types/index.ts              ← Run: supabase gen types
│       └── package.json
│
└── supabase/
    ├── migrations/001_initial_schema.sql  ← ✅ Written (28 tables + RLS)
    ├── functions/
    │   ├── commission-calculate/index.ts  ← ✅ Written
    │   ├── attendance-otp/index.ts        ← ✅ Written
    │   ├── payment-webhook/index.ts       ← ✅ Written
    │   ├── kpi-calculate/index.ts         ← ✅ Written
    │   ├── notify-send/index.ts           ← ✅ Written
    │   └── invoice-generate/index.ts      ← ✅ Written
    └── config.toml
```

---

## 2. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+60XXXXXXXX

# Firebase (Push)
FIREBASE_PROJECT_ID=he-system
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@he-system.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# Resend (Email)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@happyenglish.edu.vn

# App
NEXT_PUBLIC_APP_URL=https://app.happyenglish.edu.vn
NEXT_PUBLIC_APP_NAME=HE-SYSTEM
```

Also add all secret keys to Supabase Dashboard → Edge Functions → Secrets.

---

## 3. RBAC Middleware

`apps/web/middleware.ts` — protects all portal routes:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_ROUTES: Record<string, string> = {
  student:    '/student',
  teacher:    '/teacher',
  admin:      '/admin',
  management: '/management',
  partner:    '/partner',
  parent:     '/parent',
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
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = data?.role
    if (role) {
      const allowedPrefix = ROLE_ROUTES[role]
      if (!pathname.startsWith(allowedPrefix) && !pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL(`${allowedPrefix}/dashboard`, request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## 4. Supabase Client Setup

`apps/web/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@he-system/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`apps/web/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@he-system/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}
```

---

## 5. Tailwind Design Tokens

`apps/web/tailwind.config.ts`:
```typescript
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          blue:        '#1B3D8C',
          'blue-light': '#2E5FCC',
          red:         '#DC2626',
          gold:        '#F59E0B',
          black:       '#0F172A',
        },
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
      },
    },
  },
}
```

---

## 6. Edge Functions Summary

| Function | Trigger | What it does |
|----------|---------|-------------|
| `commission-calculate` | On recruit enrolled | Calculates commission %, inserts commission record, updates partner total, notifies |
| `attendance-otp` | Teacher generates / student validates | Generates 6-digit OTP (15min expiry) or validates and marks attendance |
| `payment-webhook` | Stripe `payment_intent.succeeded` | Verifies signature, updates invoice to paid, records payment, notifies student |
| `kpi-calculate` | CRON: 1st of each month | Aggregates prior month data for all teachers, runs KPI formula, upserts records |
| `notify-send` | Called by other functions | Routes to Expo push, Twilio SMS, Resend email, always inserts to notifications |
| `invoice-generate` | Admin trigger | Generates HE-YYYY-NNNN invoice number, inserts fee_invoices, notifies student + parent |

---

## 7. Realtime Subscriptions

Enable in Supabase Dashboard → Database → Replication for tables:
`notifications`, `kpi_records`, `attendance_records`, `fee_invoices`

```typescript
const channel = supabase
  .channel('my-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    setNotifications(prev => [payload.new, ...prev])
  })
  .subscribe()
```

---

## 8. Mobile Push Notification Setup

1. Create Firebase project → console.firebase.google.com
2. Add Android + iOS apps, download config files
3. `npx expo install expo-notifications`
4. Register token on login:

```typescript
const { data: token } = await Notifications.getExpoPushTokenAsync()
await supabase.from('users').update({ expo_push_token: token.data }).eq('id', userId)
```

---

## 9. Quick-Start Commands

```bash
# 1. Install dependencies
pnpm install

# 2. Set up env vars
cp .env.example apps/web/.env.local

# 3. Start local Supabase
npx supabase start

# 4. Push schema
npx supabase db push

# 5. Generate TypeScript types
npx supabase gen types typescript --local > packages/database/types/index.ts

# 6. Run web
pnpm --filter @he-system/web dev

# 7. Run mobile
pnpm --filter @he-system/mobile start

# 8. Deploy edge functions
npx supabase functions deploy --all

# 9. Deploy web
# Connect repo to Vercel, set env vars, deploy

# 10. Build mobile
eas build --platform all
eas submit --platform all
```

---

## 10. Deployment Checklist

| Service | Platform | Config |
|---------|----------|--------|
| Web app | Vercel | Connect GitHub, set env vars, auto-deploy on main |
| Mobile iOS | EAS + App Store | `eas build --platform ios` |
| Mobile Android | EAS + Play Store | `eas build --platform android` |
| Database | Supabase | Apply migrations via CLI |
| Edge Functions | Supabase | `supabase functions deploy --all` |
| Domain | Vercel DNS | Point `app.happyenglish.edu.vn` to Vercel |

---

*Generated by HE-SYSTEM Architecture Session — June 2026*
