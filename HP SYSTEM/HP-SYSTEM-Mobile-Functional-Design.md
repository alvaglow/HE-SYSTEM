# HP System — Mobile App: Finalized Functional Design
### (Section 1.1 — Functional: what the mobile app does)
_Owner: Al · Author: technology director · 16 June 2026 · Status: **Finalized for Stages 0–3; gaps flagged for Stage 4**_

This is the detailed, testable functional specification for the **mobile** app. It is the
mobile-specific expansion of §1.1 in `HP-SYSTEM-System-Design.md`, and it describes the app
**as actually built** (Expo / React Native on the shared Firebase backbone).

---

## 1. Scope, platforms, roles

- **Platforms:** iOS and Android, one codebase (Expo managed / React Native).
- **Backbone:** same Firebase project as the web app — **one login, one Firestore, the
  same Cloud Functions**. A phone action and a web action operate on the same data.
- **Roles served on mobile:** **Student** and **Parent** (the people who need it on the go).
- **Out of scope on mobile (web-first by design):** Teacher, Admin, Management, Partner
  workflows. Rationale: staff tasks (grade entry, enrolment, finance, OTP generation) are
  desk activities better suited to the larger web UI.

---

## 2. Navigation map

```
App launch
  │
  ├─ not signed in ──────────────►  Login
  │                                   • email + password (Firebase)
  │                                   • biometric unlock (if a session is stored)
  │
  └─ signed in ──► role?
        ├─ student ─► Bottom tabs:  [ 🏠 Home ] [ ✋ Attendance ] [ 💳 Payment ]
        └─ parent  ─► Bottom tabs:  [ 👨‍👩‍👧 Home ] [ 💳 Payment ]
```
Session is driven by Firebase Auth state (persisted across app restarts); the correct tab
set is chosen from the user's `role`.

---

## 3. Functional requirements (numbered & testable)

Each requirement has an ID, the screen/module that implements it, and an acceptance test.

### A. Authentication & session — `LoginScreen`, `App.js`, `firebase.js`, `biometric.js`

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| MF‑A1 | Sign in with **email + password** via Firebase Auth (same accounts as web). | `student@hp.edu` signs in on phone and web with the same credentials. |
| MF‑A2 | **Persistent session** across app restarts (AsyncStorage persistence). | Kill & reopen the app → still signed in. |
| MF‑A3 | **Biometric unlock** (Face ID / fingerprint) when available, for a stored session. | With a saved session, biometric prompt unlocks without re-typing the password. |
| MF‑A4 | **Role-based routing** (student tabs vs parent tabs) from the `users` profile. | A parent account lands on parent tabs; a student on student tabs. |
| MF‑A5 | Friendly, localized error messages mapped from Firebase error codes. | Wrong password shows "Sai mật khẩu", not a raw code. |

### B. Student home — `StudentDashboard`

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| MF‑B1 | Show **live** GPA, attendance %, and present-count for the signed-in student. | Values match the web Student portal; update without manual refresh. |
| MF‑B2 | Show **outstanding fees**; tapping opens Payment. | After paying, the figure drops on the dashboard in real time. |
| MF‑B3 | One-tap **check-in** shortcut to the Attendance tab. | Button navigates to Attendance. |

### C. Attendance check-in — `AttendanceScreen`, `FaceScanButton`

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| MF‑C1 | Enter the **6-digit OTP** the teacher generated (web). | OTP field accepts 6 digits. |
| MF‑C2 | **Face liveness** check with randomized anti-spoof challenges (blink / smile / nod). | Scan only completes after the challenges are met. |
| MF‑C3 | Capture **GPS** location (permission-gated, high accuracy). | First use requests location permission; denial is handled gracefully. |
| MF‑C4 | Validate the OTP against an **active session** in the shared Firestore. | A wrong/expired code shows "Mã không hợp lệ hoặc đã hết hạn". |
| MF‑C5 | Write an **attendanceRecord** (student, session, status, method, location, time) to the shared store. | The teacher's web screen shows the check-in within ~1s. |
| MF‑C6 | Show **recent check-ins live** + clear success/error states. | A new check-in appears in the list immediately. |
| MF‑C7 | **Offline tolerance** — a check-in made offline syncs when back online (Firestore cache). | Toggle airplane mode, check in, reconnect → record appears server-side. |

### D. Payments — `PaymentScreen`

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| MF‑D1 | List **unpaid invoices** (the student's own, or a selected child's for parents). | Only unpaid invoices show; paid ones disappear. |
| MF‑D2 | Choose a **gateway**: ZaloPay (default), VNPay, or MoMo. | Selection highlights the chosen gateway. |
| MF‑D3 | Start payment via the **same `createPayment` Cloud Function** the web uses; open the gateway URL/deeplink. | A sandbox checkout opens in the gateway app/browser. |
| MF‑D4 | Settlement is **server-side** (gateway webhook → `onPaymentPaid`); the invoice clears automatically. | After a sandbox payment, the invoice flips to paid on phone **and** web; partner commission becomes payable. |

### E. Parent home — `ParentDashboard`

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| MF‑E1 | List **children** linked to the parent (by `guardianId`). | Seeded child appears under the parent account. |
| MF‑E2 | Per child: attendance %, GPA, and a status indicator. | Values match the child's student record. |
| MF‑E3 | Pay a **child's** fees (opens Payment scoped to that child). | Parent can pay the child's invoice end-to-end. |

### F. Notifications & push — `data.js`, `sendPushOnNotification` (Cloud Function)

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| MF‑F1 | Register an **Expo push token** on login, stored on the user's doc. | After login, `users/{uid}.pushToken` is populated (on a real device with EAS projectId). |
| MF‑F2 | Receive a **push** when a notification is created for that user (e.g., payment receipt, grade posted). | Posting a notification for the user delivers a device push. |

### G. Cross-cutting

| ID | Requirement | Notes |
|----|-------------|-------|
| MF‑G1 | **Vietnamese-first** UI copy. | All screens localized; English secondary. |
| MF‑G2 | **Permissions** declared & requested: camera, location, notifications. | `app.json` plugins + runtime prompts. |
| MF‑G3 | **Offline** tolerance via Firestore's native cache. | Reads served from cache; writes queue. |
| MF‑G4 | **Dark theme** + HP branding (icon, splash). | Matches brand palette. |

---

## 4. Data the mobile app touches

| Screen | Reads | Writes |
|--------|-------|--------|
| Login | `users/{uid}` (role/profile) | `users/{uid}.pushToken` |
| Student Home | `students`, `invoices`, `attendanceRecords` | — |
| Attendance | `attendanceSessions` (validate OTP), `attendanceRecords` | `attendanceRecords` |
| Payment | `invoices` (+ resolves `students`) | `payments` (via Cloud Function) |
| Parent Home | `students` (by `guardianId`) | — |

All reads are real-time (`onSnapshot`); all sensitive writes (payments) go through Cloud
Functions; security rules (see system design §3.5) govern every access.

---

## 5. States & error handling

- **Loading:** Expo splash on launch; spinners during sign-in, face/GPS verification, and
  payment initiation.
- **Empty:** "no outstanding invoices", "no check-ins yet", "no children linked".
- **Errors:** localized messages for auth failures, invalid/expired OTP, location-permission
  denial, and gateway/payment errors.
- **Offline:** writes queue locally and sync automatically; reads come from cache.

---

## 6. Explicitly out of scope (mobile)

- Staff workflows (teacher/admin/management/partner) — web only.
- In-app notification **list/center** (web has the bell panel; mobile receives push only).
- **Autopay** toggle and **TOTP** code entry from the original REST build — removed;
  superseded by Firebase Auth + biometric.

---

## 7. Known gaps → Stage 4 (mobile)

1. **Sign-out UI.** `data.logout()` exists but isn't yet surfaced as a button/menu — add to
   a profile/settings entry.
2. **Server-side geofence validation.** GPS is captured and stored, but distance-to-school
   enforcement isn't applied in the Firebase path — add a check in `checkInByOtp` rules or a
   Function (the original REST `OUTSIDE_GEOFENCE` logic can be ported).
3. **Liveness verification.** The face-liveness token is a client-side hash placeholder;
   production should verify liveness server-side before accepting a check-in.
4. **Push prerequisites.** Expo push needs an **EAS `projectId`** (`eas build:configure`);
   until set, push registration no-ops gracefully.
5. **In-app notification center** (optional) to mirror the web bell panel.

---

## 8. End-to-end acceptance checklist (cross-device proof)

1. Seed the project; deploy Functions. ☐
2. Sign in on **web** as teacher → generate an attendance OTP. ☐
3. Sign in on **mobile** as `student@hp.edu` → enter OTP → pass face + GPS → check in. ☐
4. Confirm the check-in appears on the **teacher's web** screen in real time. ☐
5. On mobile **Payment**, pay the open invoice (sandbox) → invoice clears on phone **and**
   web; partner commission becomes payable; receipt notification fires. ☐
6. Kill/reopen the app → still signed in (persistent session). ☐

When all six pass, the mobile functional scope (Stages 0–3) is verified.
