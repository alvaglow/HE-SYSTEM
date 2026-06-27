# HE-SYSTEM — Happy English Platform

Full-stack learning management and operations platform. Monorepo with Next.js web app, Expo mobile app, shared TypeScript utilities, and Supabase backend.

---

## Quick Start (10 steps)

### Prerequisites

- Node.js 20+
- pnpm 9+ → `npm install -g pnpm`
- Supabase CLI → `npm install -g supabase`
- Expo CLI → `npm install -g expo-cli eas-cli`

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example apps/web/.env.local
cp .env.example apps/mobile/.env
```

Fill in all values from your Supabase project and third-party services.

### 3. Start local Supabase

```bash
npx supabase start
```

This starts PostgreSQL, Auth, Storage, and Edge Functions locally on Docker.

### 4. Run the database migration

```bash
npx supabase db push
# or
npx supabase migration run
```

This applies `supabase/migrations/001_initial_schema.sql` — creates all 28 tables, indexes, triggers, RLS policies, and seeds the Happy English institution row.

### 5. Generate TypeScript types

```bash
npx supabase gen types typescript --local > packages/database/types/index.ts
```

### 6. Start the web app (development)

```bash
pnpm dev
# or target only web:
pnpm --filter @he-system/web dev
```

Web app runs at: http://localhost:3000

### 7. Start the mobile app (development)

```bash
pnpm --filter @he-system/mobile start
# then scan QR with Expo Go app
```

### 8. Deploy Edge Functions

```bash
npx supabase functions deploy commission-calculate
npx supabase functions deploy attendance-otp
npx supabase functions deploy payment-webhook
npx supabase functions deploy kpi-calculate
npx supabase functions deploy notify-send
npx supabase functions deploy invoice-generate
```

### 9. Deploy web app

```bash
pnpm build
# Then connect repo to Vercel and deploy
```

### 10. Build mobile app

```bash
eas build --platform all
eas submit --platform all
```

---

## Project Structure

```
HED_SYSTEM/
├── apps/
│   ├── web/                    # Next.js 14 App Router (TypeScript)
│   │   ├── app/
│   │   │   ├── (auth)/         # Login page
│   │   │   ├── (student)/      # Student portal
│   │   │   ├── (teacher)/      # Teacher portal
│   │   │   ├── (partner)/      # Partner/affiliate portal
│   │   │   ├── (admin)/        # Admin portal
│   │   │   ├── (management)/   # Management portal
│   │   │   └── (parent)/       # Parent portal
│   │   ├── lib/
│   │   │   ├── supabase/       # Browser + server Supabase clients
│   │   │   └── i18n/           # English + Vietnamese translations
│   │   └── middleware.ts        # RBAC redirect middleware
│   │
│   └── mobile/                 # Expo React Native (iOS + Android)
│       ├── app/
│       │   ├── (auth)/         # Login screen
│       │   └── _layout.tsx     # Root layout + push token registration
│       └── lib/
│           └── supabase.ts     # Supabase client with SecureStore
│
├── packages/
│   ├── shared/                 # Shared TypeScript utilities
│   │   ├── utils/
│   │   │   ├── commission-formula.ts   # Partner commission engine
│   │   │   ├── kpi-calculator.ts       # Teacher + staff KPI engine
│   │   │   └── format.ts               # Currency, date, invoice formatters
│   │   ├── types/index.ts              # Shared type definitions
│   │   └── hooks/useAuth.ts            # Auth hook
│   │
│   └── database/
│       └── types/index.ts      # Supabase-generated Database type
│
└── supabase/
    ├── config.toml             # Local dev config + CRON schedule
    ├── migrations/
    │   └── 001_initial_schema.sql   # 28 tables, RLS, triggers, seed
    └── functions/
        ├── commission-calculate/   # Calculate + store partner commission
        ├── attendance-otp/         # Generate + validate OTP attendance
        ├── payment-webhook/        # Stripe webhook handler
        ├── kpi-calculate/          # Monthly KPI CRON job
        ├── notify-send/            # Multi-channel notification router
        └── invoice-generate/       # Auto-generate fee invoices
```

---

## Portals

| Role | URL | Description |
|------|-----|-------------|
| Student | `/student/dashboard` | Attendance, results, invoices, schedule |
| Teacher | `/teacher/dashboard` | Classes, KPI, marking, student tracking |
| Admin/Staff | `/admin/dashboard` | Student management, invoicing, scheduling |
| Management | `/management/dashboard` | KPI overview, financials, analytics |
| Partner | `/partner/dashboard` | Commission tracking, referral link, tier progress |
| Parent | `/parent/dashboard` | Multi-child view: attendance, results, fees |

---

## Commission Formula

```
Commission% = min(35%, 8% + students × 0.4%)
```

| Tier | Students | Commission |
|------|----------|------------|
| ⚪ Starter | 1–5 | 8.4%–10% |
| 🥉 Bronze | 6–15 | 10.4%–14% |
| 🥈 Silver | 16–30 | 14.4%–20% |
| 🥇 Gold | 31–60 | 20.4%–32% |
| 💎 Platinum | 61+ | 35% (capped) |

---

## KPI Framework

**Teachers (4 pillars):**
- P1 Teaching Hours & Attendance — 25%
- P2 Student Outcomes — 35%
- P3 Administrative Tasks — 25%
- P4 Research & Development — 15%

**Staff (2 pillars):**
- P1 Attendance & Punctuality — 50%
- P2 Task Completion — 50%

**Grades:** A (≥90), B (≥75), C (≥60), D (≥45), F (<45)

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Mobile | Expo React Native, Expo Router |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Edge Functions | Deno (Supabase Edge Functions) |
| Auth | Supabase Auth + JWT, RLS per role |
| Payments | Stripe |
| Push Notifications | Expo Push + Firebase FCM |
| SMS | Twilio |
| Email | Resend |
| Maps | Google Maps (3 class location types) |
| Deployment | Vercel (web), EAS (mobile) |

---

## Environment Variables

See `.env.example` for the complete list. Key variables:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

---

## Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#1B3D8C` | Headers, nav, primary actions |
| Accent Red | `#DC2626` | Badges, alerts, CTAs |
| Gold | `#F59E0B` | Highlights, tier badges |
| Dark | `#0F172A` | Text, backgrounds |

Font: **Oswald 700** (headings) + **Inter** (body)

---

## License

Proprietary — Happy English. All rights reserved.
