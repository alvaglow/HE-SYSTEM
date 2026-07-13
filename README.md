# HE-SYSTEM — Happy English Platform

Full-stack learning management and operations platform. Monorepo with Next.js web app, Expo mobile app, shared TypeScript utilities, and Supabase backend.

> **One consolidated system.** This repo used to contain three parallel,
> conflicting builds of the same product: this Next.js/Supabase app (the one
> actually deployed to Vercel), an orphaned partial duplicate
> (`HAPPY_ENGLISH_SYSTEM (HE_SYSTEM)/`), and a completely separate
> Express/raw-Postgres/Firebase build (`HP SYSTEM/`) with Vietnamese payment
> gateways and biometric attendance that this app never had access to. The
> unique functionality from `HP SYSTEM` has been ported in as Supabase Edge
> Functions (see below); the old folders are kept for reference under
> `archive/` but are not part of the running system.

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

This applies `supabase/migrations/001_initial_schema.sql` (core schema — 30 tables, indexes, triggers, RLS policies, seeds the Happy English institution row) and `002_ported_features.sql` (payment gateway transactions, multi-device registration, GPS/biometric attendance columns, Merkle roots, and the tamper-proof audit log — ported from the archived `HP SYSTEM` build).

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
npx supabase functions deploy attendance-checkin
npx supabase functions deploy payment-webhook
npx supabase functions deploy payment-zalopay
npx supabase functions deploy payment-vnpay
npx supabase functions deploy payment-momo
npx supabase functions deploy merkle-build
npx supabase functions deploy kpi-calculate
npx supabase functions deploy notify-send
npx supabase functions deploy invoice-generate
```

Set each gateway's callback/IPN/return URL in its own merchant dashboard to point at the deployed function's URL (`https://YOUR_PROJECT_REF.supabase.co/functions/v1/payment-zalopay`, etc.) — see `.env.example` for the exact variable names.

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
│   │   │   ├── edgeFunctions.ts # Typed client for all Supabase Edge Functions
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
├── supabase/
│   ├── config.toml             # Local dev config + CRON schedules
│   ├── migrations/
│   │   ├── 001_initial_schema.sql      # 30 tables, RLS, triggers, seed
│   │   └── 002_ported_features.sql     # payments/devices/attendance/audit tables ported from HP SYSTEM
│   └── functions/
│       ├── _shared/
│       │   └── email-template.ts       # Shared invoice/receipt HTML templates
│       ├── commission-calculate/       # Calculate + store partner commission
│       ├── attendance-otp/             # Generate + validate OTP attendance
│       ├── attendance-checkin/         # GPS geofence + biometric liveness check-in
│       ├── merkle-build/               # Daily tamper-proof Merkle root + proofs
│       ├── payment-webhook/            # Stripe webhook handler
│       ├── payment-zalopay/            # ZaloPay create + callback
│       ├── payment-vnpay/              # VNPay create + return + query
│       ├── payment-momo/               # MoMo create + IPN
│       ├── kpi-calculate/              # Monthly KPI CRON job
│       ├── notify-send/                # Multi-channel notification router (Expo, FCM, SMS, email, Zalo OA, in-app)
│       └── invoice-generate/           # Auto-generate fee invoices
│
└── archive/                    # Retired parallel builds — not part of the running system
    ├── HP SYSTEM/               # Former Express/Postgres/Firebase build (payment gateways + attendance logic ported above)
    └── HAPPY_ENGLISH_SYSTEM (HE_SYSTEM)/   # Orphaned partial duplicate (docs only)
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
| Payments | Stripe (international) + ZaloPay, VNPay, MoMo (Vietnam) |
| Attendance | OTP (existing) + GPS geofence & biometric liveness (ported), Merkle-tree tamper-proofing |
| Push Notifications | Expo Push + Firebase FCM (multi-device) |
| SMS | Twilio |
| Email | Resend (HTML invoice/receipt templates) |
| Chat notifications | Zalo Official Account |
| Maps | Google Maps (3 class location types) |
| Audit | SHA-256 hash-chained audit log |
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
ZALOPAY_APP_ID= / ZALOPAY_KEY1= / ZALOPAY_KEY2=
VNPAY_TMN_CODE= / VNPAY_HASH_SECRET=
MOMO_PARTNER_CODE= / MOMO_ACCESS_KEY= / MOMO_SECRET_KEY=
LIVENESS_SECRET=
ZALO_OA_ACCESS_TOKEN=
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

See `.env.example` for the full, current list — it's the source of truth.

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
