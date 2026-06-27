# HP System — Finalized System Design (Web + Mobile)
_Owner: Al · Author: technology director · 16 June 2026 · Status: **Finalized for Stages 0–3; Stage 4 (hardening) flagged inline**_

---

## 0. Executive summary (plain English)

HP System is a learning-management platform for an English-language school in Vietnam,
used by six roles — **student, teacher, admin, management, partner, parent** — across a
**web app** and a **mobile app**. Both apps run on **one shared backbone** (Google
Firebase), so an action in one place ripples everywhere in real time: a teacher enters a
grade and the student and parent see it; a student checks in by face on their phone and
the teacher sees it on the web; a fee is paid and the invoice clears, the partner's
commission becomes payable, and the finance numbers move — automatically.

**Finalized architecture decision:** Firebase-centric. Clients talk directly to Firebase
Auth + Firestore for real-time data, and to Cloud Functions for money and trust
operations (payments, settlement, scheduled jobs, audit, push). The previously-built
Node/PostgreSQL backend is retained only as reference; its valuable payment-gateway
signing logic was relocated into Cloud Functions.

This document is the single source of truth for the design: what it does, how it's built,
how it scales, the trade-offs taken, and what to revisit as it grows.

---

## 1. Requirements

### 1.1 Functional (what it does)

| Role | Web | Mobile | Core capabilities |
|------|-----|--------|-------------------|
| Student | ✓ | ✓ | Dashboard, timetable, results, attendance check-in, fees/payment, notifications |
| Teacher | ✓ | — | Dashboard, grade entry, OTP attendance sessions, leave requests |
| Admin | ✓ | — | Student enrolment, staff, invoices, oversight |
| Management | ✓ | — | KPI/finance dashboards, headcount, analytics |
| Partner | ✓ | — | Referrals, commissions, tier/leaderboard |
| Parent | ✓ | ✓ | Child progress, attendance, fee alerts & payment |

Cross-cutting features: real-time updates, role-based access, Vietnamese/English i18n,
in-app payments via **MoMo / VNPay / ZaloPay**, face + GPS attendance, push notifications,
and an append-only audit trail.

> **Mobile detail:** the full, testable mobile functional spec (the deep expansion of this
> section for the phone app — Student & Parent) lives in
> `HP-SYSTEM-Mobile-Functional-Design.md`.

### 1.2 Non-functional

- **Scale (design target):** up to ~5,000 active students (current ~850); tens of
  thousands of records per collection per year.
- **Concurrency:** bursty attendance (a class of ~30 checking in within ~5 min); a few
  thousand concurrent real-time listeners at peak.
- **Latency:** real-time propagation < ~1s for data changes; payment redirect < ~3s.
- **Availability:** target 99.9% (inherits Firebase SLAs); no single-host failure point.
- **Security & compliance:** Vietnam **Decree 13/2023 (PDPD)** — least-privilege access,
  encryption at rest, audit logging, data-residency awareness, retention controls.
- **Offline:** mobile must tolerate spotty connectivity (queue writes, sync later).
- **Cost:** predictable, pay-as-you-grow; usable within low tiers at current scale.

### 1.3 Constraints

- **Team:** small / non-technical owner → favor managed services, minimal ops.
- **Existing assets:** finished web UI (single-file React + in-browser Babel), Expo
  (managed) mobile app, and a Node/PostgreSQL backend with VN payment logic.
- **Market:** Vietnam (currency VND, local gateways, Vietnamese-first UX).
- **No build pipeline on web** (deploys as a single static HTML file) — deliberate, to
  keep deployment trivial.

---

## 2. High-level design

### 2.1 Component diagram

```
        ┌──────────────────┐        ┌──────────────────────┐
        │   WEB APP        │        │   MOBILE APP         │
        │ HP-SYSTEM.html   │        │ Expo / React Native  │
        │ React (CDN+Babel)│        │ firebase JS SDK      │
        │ HP_DATA service  │        │ data.js service      │
        └───────┬──────────┘        └──────────┬───────────┘
                │  (Firebase JS SDK: Auth, Firestore, Functions)
                ▼                              ▼
        ┌───────────────────────────────────────────────────┐
        │                  FIREBASE (Google)                 │
        │  Auth   Firestore(real-time)   Hosting   Storage   │
        │                     │                              │
        │              Cloud Functions                       │
        │  createPayment · momoIpn · vnpayIpn · zalopay      │
        │  onPaymentPaid(settle) · scheduled jobs ·          │
        │  syncRoleClaim · sendPushOnNotification            │
        └───────┬───────────────────────────────┬───────────┘
                │ (HTTPS, signed)                │ (Expo Push)
                ▼                                ▼
   ┌────────────────────────┐          ┌──────────────────┐
   │ MoMo / VNPay / ZaloPay │          │ Expo Push / FCM  │
   │ (payment gateways)     │          │ (notifications)  │
   └────────────────────────┘          └──────────────────┘
```

### 2.2 Storage choice

**Firestore (document database)** is the system of record. Rationale: real-time
listeners out of the box (the "ripple"), offline persistence on mobile, fine-grained
security rules per document, no servers to operate, and horizontal auto-scaling.
Trade-off vs. PostgreSQL discussed in §6.

### 2.3 The "API contract"

There is no hand-written REST layer. The contract is three things:
1. **Firestore collections + document shapes** (§3.1) — read/written directly by clients
   via the SDK, governed by **security rules** (§3.5).
2. **Cloud Functions** — callable + HTTPS + triggers (§3.2) for anything that must not be
   trusted to the client (payments, settlement, claims, push).
3. **Composite indexes** (§3.3) for multi-field queries.

### 2.4 Key data flows

**Enrolment:** Admin (web) → `students` + `invoices` (+ `commissions` if referred) +
`notifications` + `auditLogs` → ripples to Teacher rosters, Management headcount, Partner
view, Parent profile (all via real-time listeners).

**Attendance:** Teacher opens session → `attendanceSessions{otpCode,isActive}` → Student
(web or mobile, face+GPS) writes `attendanceRecords` → Teacher/Management see it live.

**Payment:** Client calls `createPayment` → `payments{pending}` + gateway URL → user pays
→ gateway webhook verifies signature → marks payment paid → `onPaymentPaid` trigger
settles: `invoice→paid`, `commission→payable`, notification, audit.

---

## 3. Deep dive

### 3.1 Data model (collections)

```
users/{uid}              role, name, email, avatar, pushToken, createdAt
students/{studentId}     studentId, name, programme, intake, semester, status,
                         gpa, attendance, feeBalance, studentUserId, guardianId,
                         referringPartnerId, createdAt
teachers/{teacherId}     staffId, userId, department, employmentType, kpiScore, kpiGrade
classes/{classId}        name, code, room, schedule, credits, teacherId, teacherName, status
enrollments/{id}         classId, className, studentId, studentUserId, guardianId, status
attendanceSessions/{id}  classId, teacherId, otpCode, isActive, date, expiresAt
attendanceRecords/{id}   sessionId, classId, studentId, status, method, location, timestamp
grades/{studentId}       studentId, ass1, ass2, final, overall, updatedAt
invoices/{id}            studentId, studentUserId?, desc, amount, currency, due, status, paidAt
payments/{id}            invoiceId, studentId, studentUserId, amount, method,
                         status, gatewayOrderId, gatewayTxnId, createdAt, paidAt
commissions/{id}         partnerId, studentId, amount, rate, month, status, settledAt
commissionPayouts/{id}   partnerId, month, amount, status
leaveRequests/{id}       teacherId, type, from, to, days, reason, status
notifications/{id}       userId, type, title, body, read, createdAt
auditLogs/{id}           actorUid, action, detail, createdAt   (append-only)
```

**Relationships (the interconnection):** every record points back to `users` and/or a
`studentId`. `enrollments` join `classes` ↔ `students`. `attendanceRecords` roll up into a
student's attendance. `payments` settle `invoices`, which flip `commissions`. Foreign keys
are document IDs / fields, enforced in application + rules (Firestore is schemaless).

### 3.2 Cloud Functions (the trusted layer)

| Function | Trigger | Responsibility |
|----------|---------|----------------|
| `createPayment` | HTTPS callable (auth required) | Reads invoice, writes `payments{pending}`, calls gateway, returns pay URL/deeplink |
| `momoIpn` / `vnpayIpn` / `zalopayCallback` | HTTPS | Verify gateway signature (HMAC-SHA256/512), mark payment **paid** |
| `onPaymentPaid` | Firestore `payments` onWrite | **Single settlement point** (idempotent): invoice→paid, commission→payable, notify, audit |
| `markOverdueInvoices` | Scheduled (daily) | Flag unpaid past-due invoices, notify |
| `monthlyCommissionRollup` | Scheduled (monthly) | Summarize payable commissions per partner |
| `syncRoleClaim` | Firestore `users` onWrite | Mirror `role` into the auth token's custom claim |
| `sendPushOnNotification` | Firestore `notifications` onCreate | Deliver to the target user's Expo push token |

Centralizing settlement in `onPaymentPaid` means **all three gateways share one money
ripple**, and a re-delivered webhook can't double-charge (it no-ops if already paid).

### 3.3 Indexes

Composite indexes are defined for: `students(referringPartnerId,status)`,
`attendanceSessions(classId,isActive,createdAt)`, `attendanceRecords(studentId,timestamp)`,
`enrollments(classId,status)`, `grades(studentId,updatedAt)`, `invoices(studentId,dueDate)`,
`payments(studentUserId,createdAt)`, `commissions(partnerId,month)`,
`notifications(userId,read,createdAt)`, `auditLogs(actorUid,createdAt)`.

### 3.4 Real-time, caching, and offline

- **No separate cache.** Firestore `onSnapshot` listeners are the read path; the SDK keeps
  a local cache and pushes deltas. This is simpler and lower-latency than a cache tier.
- **Offline:** web enables IndexedDB persistence; mobile uses the SDK's native offline
  cache — writes (e.g., a check-in) queue locally and sync on reconnect.
- **Demo mode (web):** an in-memory reactive store mirrors the same interface so the app is
  fully explorable with no credentials (`?demo=1`).

### 3.5 Security model

- **Rules:** per-collection, least-privilege (owner-or-role) across the 14 collections
  written by clients. Students read their own records; staff read within scope;
  admin/management write where appropriate; `auditLogs` are append-only (no update/delete).
  _Known gap: `commissionPayouts` is written only by Functions (admin SDK) and currently
  has no client read rule — add a management/partner read rule in Stage 4._
- **Custom claims:** `syncRoleClaim` writes the role into the auth token. _(Stage-4
  hardening: switch rules from `get(users/uid).role` to `request.auth.token.role` to remove
  a per-request read — see §7.)_
- **Trusted writes:** payments/settlement run only in Cloud Functions (admin SDK), never
  trusted to the client.
- **Decree 13:** Firestore encrypts at rest; PII access is gated by rules; the audit log
  provides traceability; region selection (asia-southeast1) supports residency.

### 3.6 Error handling & idempotency

- **Payments:** `createPayment` records a pending payment keyed by a unique
  `gatewayOrderId`; webhooks look it up; settlement is idempotent on invoice state.
- **Webhooks:** signature-verified; on failure return the gateway's expected error ack so
  it retries; duplicates are safe.
- **Functions:** wrapped in try/catch with structured logs; transient gateway errors mark
  the payment `failed` (user can retry).
- **Clients:** graceful fallbacks (demo mode, 8s auth timeout on web, friendly error
  messages on mobile).

---

## 4. Scale & reliability

### 4.1 Load estimation (design target ~5,000 students)

| Dimension | Estimate | Headroom |
|-----------|----------|----------|
| Concurrent real-time listeners | ~3k–15k | Firestore supports ~1M connections |
| Peak attendance writes | ~2–10 writes/s (distinct docs) | Well within limits (per-doc 1 w/s only) |
| Payments | ~5k/month (bursty at term start) | Trivial for Functions |
| Push notifications | fan-out per event | Batchable; Expo handles volume |
| Reads/day | dominated by dashboards via listeners | Cost-managed (see §7) |

### 4.2 Scaling approach

- **Vertical:** none to manage — Firestore/Functions auto-scale.
- **Horizontal:** Firestore shards automatically; Functions scale by concurrency.
- **Hot-doc avoidance:** no single document is written more than ~1×/sec; counters/rollups
  are computed, not hammered.
- **Aggregation:** management dashboards currently count by reading collections
  client-side — fine at thousands; **revisit** with Firestore `count()` aggregation or
  maintained counter docs beyond ~10k (see §7).

### 4.3 Failover & redundancy

- Firebase services are multi-zone within the chosen region. No app servers to fail.
- Payment correctness survives partial failure via webhook retries + idempotent settlement.
- Mobile offline cache keeps the app usable during network loss.

### 4.4 Monitoring, alerting, backup (Stage-4 deliverables)

- **Monitoring:** Cloud Functions logs/metrics; Firestore usage dashboards; mobile
  Crashlytics + Performance.
- **Alerting:** Firebase **budget alerts** (cost), function error-rate alerts.
- **Backup/DR:** scheduled **Firestore exports** to Cloud Storage (point-in-time restore);
  export retention policy.
- **Runbook:** documented deploy/rollback + incident steps (Stage 4).

---

## 5. Deployment topology

```
Web:      firebase deploy --only hosting        → hp-system-142a5.web.app (HP-SYSTEM.html)
Rules:    firebase deploy --only firestore:rules,firestore:indexes
Funcs:    firebase deploy --only functions       → createPayment, webhooks, triggers, jobs
Seed:     node seed/seed.js                       → users + sample data (firebase-admin)
Mobile:   eas build --platform android|ios        → app stores (same Firebase project)
Gateways: webhook URLs (…/momoIpn etc.) registered in each gateway dashboard + functions/.env
```

Environments: a single project today (`hp-system-142a5`). **Revisit:** add a separate
`hp-system-dev` project for staging before go-live (§7).

---

## 6. Trade-off analysis

| Decision | Chosen | Alternative | Why / cost |
|----------|--------|-------------|------------|
| Backbone | **Firebase** | Node + PostgreSQL | Fastest to a connected, real-time product; minimal ops. Cost: less relational reporting power, some vendor lock-in. |
| Payments | **Cloud Functions** (ported signing) | Keep Node backend | One system, less to run; reused the valuable HMAC logic. Cost: Functions cold starts (mitigated by low latency needs). |
| Web delivery | **Single-file + in-browser Babel** | Vite/Next build | Zero build, trivial deploy, easy for a non-technical owner. Cost: larger first paint, no tree-shaking, harder for a big team. |
| Reads | **Direct Firestore + listeners** | API + cache tier | Simpler, real-time native. Cost: client holds query logic; rules must be tight. |
| Mobile | **Expo (managed) + firebase JS SDK** | Bare RN + native Firebase | Faster builds, OTA updates, less native config. Cost: some native modules constrained. |
| Role in rules | **Firestore `get()` now** | Custom-claim token | Works immediately. Cost: one extra read per rule eval → switch to claims at scale (§7). |
| Aggregation | **Client-side counts now** | Counters / `count()` | Simple at current scale. Cost: read amplification at 10k+ (§7). |
| Data residency | **Firestore asia-southeast1** | Self-hosted PG in-country | Managed + regional. Cost: if regulators require in-country control, reconsider PG slice. |

---

## 7. What to revisit as it grows (scaling triggers)

1. **Security rules → custom claims.** Replace `get(/users/$uid).role` with
   `request.auth.token.role` (already synced by `syncRoleClaim`) to cut a read per rule
   evaluation. _Trigger: now/Stage 4 — it's cheap and high-value._
2. **Dashboard aggregation.** Management counts read whole collections client-side. Move to
   Firestore `count()` aggregation queries or maintained counter documents. _Trigger:
   collections > ~10k docs._
3. **Notification addressing.** Web flows target a role string (e.g. `'admin'`); for
   "notify all admins" implement fan-out (query users by role → write N notifications) or a
   topic model. _Trigger: more than one user per role in production._
4. **attendanceRecords growth.** Unbounded over years; partition by term (subcollections)
   or add TTL/archival to Storage/BigQuery. _Trigger: > ~1–2M records._
5. **Analytics/BI.** For deep reporting, stream Firestore → BigQuery (Firebase extension)
   rather than querying Firestore for analytics. _Trigger: management asks for ad-hoc
   reports/trends._
6. **Web build pipeline.** Migrate the single file to Vite/Next for performance, code
   splitting, and team scalability. _Trigger: growing dev team or performance complaints._
7. **Staging environment + CI.** Separate dev project + automated deploy/test before prod.
   _Trigger: before first real go-live._
8. **PII hardening.** Field-level encryption for the most sensitive PII and stricter
   residency if Decree 13 enforcement tightens. _Trigger: compliance review / audit._

---

## 8. Explicit assumptions

- Scale targets (~5k students) are planning estimates, not measured load.
- One Firebase project for now; payment **sandbox** keys until go-live.
- Mobile is student/parent-facing; staff workflows remain web-first (by design).
- "Finance numbers" are derived from `invoices`/`payments`/`commissions`, not a separate
  ledger (sufficient for an LMS; not a full accounting system).
- Vietnamese gateways behave per their documented sandbox/prod signing specs.

---

## 9. Status & next step

Stages 0–3 are built and validated: connected web app, payments engine (Cloud Functions),
and mobile on the same backbone. This design is **finalized** for that scope. **Stage 4**
(reporting from live aggregates, rules→claims hardening + automated tests, monitoring,
backups, staging, go-live runbook) implements §4.4 and §7 items 1–3 and 7.

_Recommended immediate path: deploy what exists (seed → functions → rules/indexes →
hosting), then execute Stage 4 hardening before onboarding real users._
