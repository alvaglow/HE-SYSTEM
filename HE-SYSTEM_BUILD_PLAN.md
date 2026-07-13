# HE-SYSTEM Build Plan

Scope: full web + mobile parity across all six role portals (Admin, Management, Parent, Partner, Student, Teacher). Priority order: correctness sweep first, then mobile buildout, then feature/launch hardening.

## Phase 0 — Cleanup (do first, small, unblocks everything else)

1. **Sync corrected web code back to your OneDrive folder.** The bash sandbox had a caching bug that silently truncated 28 freshly-written `page.tsx` files. I diagnosed and fixed all 28 in a temporary deploy clone (already live on Vercel), but your actual OneDrive project folder still has the truncated versions of everything except `management/finance`. This needs a direct re-write pass so your local folder matches what's deployed.
2. **GitHub push.** Two local commits (schema fixes + security fixes) exist only in the temp deploy clone, not on `origin/main`. Needs a scoped PAT from you, or a manual push on your end.
3. **Re-verify Admin portal (8 pages) and the earlier Management/Parent pages against the live schema.** These were built in an earlier session before I'd discovered the schema-mismatch pattern (wrong column names like `exam_name` vs `assessment_name`, a nonexistent `teacher_kpis` table, etc.). Management/Parent already checked out clean when I cross-referenced them, but Admin hasn't been checked with this level of rigor yet.

## Phase 1 — Web correctness sweep (all 6 portals)

For each portal, go page by page and verify against the actual Supabase schema (not assumed column names):
- Every `.select()` matches real table/column names
- Every insert/update payload matches real column names and enum values
- RLS policies actually allow the query pattern used (no silent empty-result bugs)
- Every interactive form (OTP check-in, publish/unpublish, payout request, leave request, etc.) round-trips correctly

Order: Admin → Management → Parent → Partner → Student → Teacher (same order used throughout this project).

Known-good already (schema-verified this session): Management (finance, kpi, partners, reports), Parent (attendance, fees, location, messages, results), Partner (all 5), Student (all 7), Teacher (all 7).
Needs first-time verification: Admin (dashboard, students, staff, enrolment, invoices, kpi, partners, timetable, announcements).

## Phase 2 — Mobile app buildout (parity with web)

Current mobile state: Expo/React Native app with only a login screen and one placeholder home screen per role — no feature screens at all. Full buildout needed, same portal order as web:

| Portal | Screens needed |
|---|---|
| Admin | Dashboard, Students, Staff, Enrolment, Invoices, KPI, Partners, Timetable, Announcements |
| Management | Dashboard, Enrolment, Finance, KPI, Partners, Reports |
| Parent | Dashboard, Attendance, Fees, Location, Messages, Results |
| Partner | Dashboard, Commission, Leaderboard, Payouts, Profile, Students |
| Student | Dashboard, Attendance (+ **GPS/biometric check-in — mobile-only, flagship feature**), Fees, Location, Messages, Results, Timetable, Wallet |
| Teacher | Dashboard, Attendance (OTP + GPS/biometric generation), Grades, KPI, Leave, Messages, Students, Timetable |

The GPS/biometric attendance check-in is the one piece of functionality that can *only* exist on mobile (it needs an on-device liveness SDK to sign the HMAC token the `attendance-checkin` edge function expects) — this was already stubbed correctly on the backend but never wired to a real UI. That's the centerpiece of the mobile build, not an afterthought.

Also needed: push notification registration (FCM/Expo tokens — columns already exist on `users`), offline queue handling for check-ins (columns already exist: `offline_queue_id`, `offline_captured_at`).

## Phase 3 — Feature completion & hardening

Deprioritized behind correctness + mobile per your call, but still open:
- Wire `notify-send` edge function to real trigger points (new message, invoice due, leave approved/rejected, KPI published) — right now it exists but nothing calls it automatically.
- File/receipt uploads (expense receipts, payout bank references, exam attachments) — `receipt_url` columns exist but no upload UI anywhere yet.
- Announcements: admin can publish, but no portal actually surfaces unread announcements to students/parents/teachers yet.
- Remaining pre-existing security advisor items: `get_my_institution_id`/`get_my_role`/`is_admin_or_above` are anon/authenticated-executable SECURITY DEFINER functions (low risk, but worth a dedicated pass since dozens of RLS policies depend on them), and enabling leaked-password-protection (a dashboard toggle, not a migration).

## Phase 4 — Testing & launch prep

- End-to-end test pass per role: create a real test account for each of the 6 roles, click through every page, confirm real data flows (not just "page loads without error").
- Edge function smoke tests for all 3 payment gateways (currently only verified they deploy and handle missing-secret gracefully, not a real sandbox transaction).
- Secrets/env checklist finalization (was in progress as task #50 from earlier — payment gateway keys, FCM/Zalo OA credentials, LIVENESS_SECRET for mobile).
- Domain + production Supabase Auth hardening (leaked password protection, rate limits).

---

**Suggested next step:** Phase 0 (sync + push), then start Phase 1 with the Admin portal audit, since that closes out "known-good" status on 100% of web before mobile work begins.
