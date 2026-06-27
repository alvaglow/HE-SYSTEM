# PREVIEW_REPORT.md — HP System (formerly HE-SYSTEM)
_Generated: 15 June 2026 · Phase 0 Audit_

---

## 1. FILES INVENTORIED (24 total)

| File | Lines | Type | Action |
|------|-------|------|--------|
| `HE-SYSTEM App.html` | ~450 | Entry HTML (React CDN) | ✅ Reuse → rename `HP-SYSTEM.html` |
| `he-app.jsx` | 485 | App shell: Login, Sidebar, TopBar | ✅ Reuse → rename `hp-app.jsx` |
| `he-ui.jsx` | 282 | Shared UI components (cards, badges, buttons) | ✅ Reuse → `hp-ui.jsx` |
| `he-data.js` | 252 | i18n strings, icons, mock data layer | ✅ Reuse → `hp-data.js` |
| `he-portals-1.jsx` | 435 | Student + Teacher portal dashboards | ✅ Reuse → `hp-portals-1.jsx` |
| `he-portals-2.jsx` | 331 | Admin + Management portal dashboards | ✅ Reuse → `hp-portals-2.jsx` |
| `he-portals-3.jsx` | 309 | Partner + Parent portal dashboards | ✅ Reuse → `hp-portals-3.jsx` |
| `he-screens-student.jsx` | 413 | Student detail screens | ✅ Reuse → `hp-screens-student.jsx` |
| `he-screens-teacher.jsx` | 395 | Teacher detail screens | ✅ Reuse → `hp-screens-teacher.jsx` |
| `he-screens-admin.jsx` | 347 | Admin enrolment, invoices, staff | ✅ Reuse → `hp-screens-admin.jsx` |
| `he-screens-mgmt.jsx` | 564 | Management KPI, finance, analytics | ✅ Reuse → `hp-screens-mgmt.jsx` |
| `he-notifications.jsx` | 189 | Notification panel | ✅ Reuse → `hp-notifications.jsx` |
| `he-calendar.jsx` | 211 | Academic calendar | ✅ Reuse → `hp-calendar.jsx` |
| `he-calendar.jsx` | 211 | Academic calendar | ✅ Reuse |
| `deck-stage.js` | ? | Presentation deck helper | 🗑️ Delete — unrelated to LMS |
| `HE-SYSTEM App.html` | ~450 | Entry HTML | ✅ Reuse → rename |
| `HE-SYSTEM Backend API.html` | spec | Node.js/PG API blueprint | 📋 Reference only (migrating to Firebase) |
| `HE-SYSTEM Backend API (Standalone).html` | spec | Same as above (offline copy) | 🗑️ Delete |
| `HE-SYSTEM User Stories.html` | spec | Agile backlog (62 stories, ~400 pts) | 📋 Keep as documentation |
| `HE-SYSTEM Design Tokens.html` | spec | Design system reference | 📋 Reference only |
| `HE-SYSTEM Mobile Spec.html` | spec | Mobile layout spec | 📋 Reference only |
| `HE-SYSTEM Deck.html` | spec | Pitch deck | 📋 Keep as-is |
| `swagger.json` | Tradestation API | ❌ Completely unrelated (legacy leftover) | 🗑️ Delete |
| `HE_SYSTEM.zip` | Archive | Duplicate backup | 🗑️ Delete |
| `HE_SYSTEM (1).zip` | Archive | Duplicate backup | 🗑️ Delete |
| `HE_SYSTEM (2).zip` | Archive | Duplicate backup | 🗑️ Delete |

---

## 2. ALL "HE SYSTEM" REFERENCES FOUND

The string `HE` (as a brand identifier) appears in:

- **Page titles:** `HE-SYSTEM — Happy English Platform`
- **Logo monogram:** `<span>HE</span>` in SVG logo block
- **JS variable namespaces:** `window.HE_I18N`, `window.HE_ICONS`, `window.HE_PORTALS`, `window.HE_MOCK`
- **Component prefixes:** `HELogin`, `HESidebar`, `HETopBar`, `HEIcon`, `HEBadge`, `HEStatCard`, `HEBtn`, `HEAvatar`, `HESectionLabel`, `HETable`, `HETier`
- **CSS class prefixes:** `.he-*`
- **Tagline:** `HE-SYSTEM v1.0 · Happy English Learning Platform`
- **File names:** all `he-*.jsx` and `he-*.js` files
- **Data keys:** `window.HE_I18N`, `window.HE_PORTALS`, `window.HE_MOCK`

**Rename plan:** All `HE` → `HP` throughout code, data, UI text, file names.

---

## 3. CURRENT DEPENDENCIES

| Dependency | Source | Status |
|-----------|--------|--------|
| React 18.3.1 | `unpkg.com` CDN | ✅ Current |
| ReactDOM 18.3.1 | `unpkg.com` CDN | ✅ Current |
| Babel Standalone 7.29 | `unpkg.com` CDN | ✅ Current |
| Inter font | Google Fonts | ✅ Keep |
| Oswald font | Google Fonts | ✅ Keep |
| JetBrains Mono | Google Fonts | ✅ Keep |
| Firebase | ❌ None | ❌ **MISSING — must add** |
| Email service | ❌ None | ❌ **MISSING — must add** |
| Payment gateway | ❌ None | ❌ **MISSING — must add** |
| Socket.IO | ❌ None | ❌ Replaced by Firestore real-time |

---

## 4. EXISTING API KEYS / CONFIG

**None found.** The entire application runs on 100% mock/hardcoded data. There are zero real API integrations in the current codebase.

---

## 5. MISSING COMPONENTS FOR HP SYSTEM

| Component | Priority | Plan |
|-----------|----------|------|
| Firebase project config (apiKey, authDomain, etc.) | 🔴 Critical | User must provide or create |
| Firebase Authentication | 🔴 Critical | Wire up email/password + Google |
| Firestore data layer | 🔴 Critical | Replace all `window.HE_MOCK` with real reads |
| Firebase Storage | 🟡 High | Student document uploads |
| Email service (Resend) | 🟡 High | Fee reminders, welcome emails |
| Firebase Security Rules | 🔴 Critical | RBAC per role |
| Stripe (payment) | 🟠 Med | Fee payments (Phase 2) |

---

## 6. BACKEND MIGRATION SUMMARY

The original spec used **Node.js + PostgreSQL + Redis + Socket.IO** (AWS EC2).
HP System replaces this entirely with **Firebase**:

| Original | HP System (Firebase) |
|----------|---------------------|
| PostgreSQL 16 (24 tables) | Firestore (6 collections) |
| Redis OTP cache | Firestore `otpSessions` with TTL via `createdAt` + Cloud Functions |
| JWT auth + refresh tokens | Firebase Auth tokens (handled by SDK) |
| Socket.IO real-time | Firestore `onSnapshot` listeners |
| Node.js/Express API | Firebase Cloud Functions (optional) |
| AWS S3 | Firebase Storage |
| Nodemailer/SendGrid | Resend (via Cloud Function) |

---

## 7. FIRESTORE COLLECTION DESIGN

```
/users/{uid}
  - role: "student" | "teacher" | "admin" | "management" | "partner" | "parent"
  - name, email, avatar, createdAt, lastLogin

/students/{studentId}
  - userId, studentId (e.g. APD21110001), programme, intake, semester
  - status, classMode, attendance%, gpa, feeBalance
  - referringPartnerId, guardianId

/teachers/{teacherId}
  - userId, staffId, department, kpiScore, kpiGrade, employmentType

/attendanceSessions/{sessionId}
  - classId, teacherId, otpCode, expiresAt, isActive, date

/attendanceRecords/{recordId}
  - sessionId, studentId, status, timestamp

/invoices/{invoiceId}
  - studentId, amount, dueDate, status, description

/commissions/{commissionId}
  - partnerId, studentId, amount, rate, month, status

/notifications/{notifId}
  - userId, type, message, read, createdAt
```

---

## 8. FILES TO DELETE

- `swagger.json` — Tradestation API spec, completely unrelated
- `deck-stage.js` — Presentation utility, no longer needed
- `HE_SYSTEM.zip`, `HE_SYSTEM (1).zip`, `HE_SYSTEM (2).zip` — Duplicate archives

---

## 9. LEGACY API / ENDPOINT FLAGS

- **Tradestation API** (`swagger.json`) — DELETE. Not related to the LMS.
- **Node.js REST endpoints** (in `HE-SYSTEM Backend API.html`) — DEPRECATED. All replaced by Firebase SDK calls.
- No third-party API keys to revoke (none were ever connected).

---

## 10. PHASE 1 → DECISION RECORD

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend framework | React 18 + Babel CDN (enhanced) | Preserves existing 4,200-line codebase; no build tool needed for deployment |
| Backend | Firebase (Auth + Firestore + Storage + Functions) | As specified; replaces all Node.js/PG/Redis |
| Styling | TailwindCSS CDN + inline CSS | TailwindCSS adds utility speed; keep existing inline CSS patterns |
| Animations | CSS transitions + keyframes | No heavy library needed; existing patterns are smooth |
| Email | Resend via Firebase Cloud Function | Modern, generous free tier, simple API |
| Payments | Stripe.js (Phase 2) | Standard for fee collection |
| Deployment | Firebase Hosting | Backend is already Firebase; zero-config |
| Monitoring | Firebase Crashlytics + Performance | Native Firebase tooling |

---

_End of PREVIEW_REPORT.md_
