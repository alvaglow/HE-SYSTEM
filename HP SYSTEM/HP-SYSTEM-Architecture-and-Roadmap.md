# HP System — Architecture & Roadmap
### The plan to make the web, backend, and mobile apps work as one connected platform
_Prepared for: Al (Owner) · Prepared by: your technology director · 16 June 2026 · Status: **awaiting your approval**_

---

## How to read this document

You don't need a technical background to follow this. I've written it the way I'd
brief an owner. It moves from **the one big decision**, to **how the data is
organised** (the part that makes everything connect), to **the staged plan** for
building it. There's a plain-English glossary at the end — any **bolded term** you
don't recognise is defined there.

Nothing in the code changes until you approve this. At the very end is a short
"**what I need from you**" list.

---

## 1. Executive summary

Today you have three well-built pieces that **don't yet talk to each other**:

1. **The web app** — runs in a browser, already connected to **Firebase** (Google's
   cloud). This is the most finished piece.
2. **The backend** — a separate, powerful engine (Node + PostgreSQL) with the
   Vietnamese payment systems (MoMo, VNPay, ZaloPay) and strong privacy/security
   code. Built, but not running yet.
3. **The mobile app** — a phone app (face check-in, GPS, offline) that is wired to
   talk to the *backend* engine, **not** to Firebase.

The problem in one sentence: **the web app and the mobile app currently live in two
different "data worlds,"** so a grade entered on one wouldn't show up on the other.
To make features "correlate and deepen within one another," they must all read and
write the **same single source of truth**.

This document recommends **how to unify them**, defines the **shared data model**
that links every feature, maps the **chain reactions** between portals, and lays out
a **staged build** (web → backend → mobile) where each stage makes the next one
deeper.

---

## 2. The one big decision: unify on a single backbone

This is the only decision that reshapes everything else, so I'm putting it first with
my recommendation.

### The choice
Everything (web **and** mobile) must use **one** system for accounts and data.
There are three honest options:

| Option | What it means | Best when |
|---|---|---|
| **A. Firebase-centric (my recommendation)** | Web and mobile both use Firebase for login + live data. The valuable payment & audit code from the existing backend is **relocated** into Firebase "**Cloud Functions**" (small server programs Google runs for you). | You want a connected, real-time product fast, with low running cost and minimal servers to babysit. |
| **B. Backend-centric** | Web and mobile both talk to the existing Node + PostgreSQL engine. The web app stops using Firebase directly. | You're hiring a backend team, need heavy financial-grade reporting, or must keep all data in your own database for compliance. |
| **C. Hybrid** | Keep both; build a bridge that copies data between them. | Rarely worth it — two systems kept in sync is the *most* complex path and the very thing we're trying to avoid. |

### My recommendation: **Option A (Firebase-centric)** — and here's the reasoning

- **Fastest to a working, connected product.** The web app already runs on Firebase;
  we extend the same backbone to mobile instead of building a second one.
- **"Live" by nature.** Firebase pushes changes instantly to every screen — exactly
  the ripple effect you want (teacher saves a grade → it appears on the student and
  parent screens *without refreshing*).
- **Low operational burden and cost.** No servers, databases, or caches for you to
  run and secure. Generous free tier; pay-as-you-grow.
- **We don't waste the backend work — we relocate it.** The payment-gateway logic
  (MoMo/VNPay/ZaloPay) and the audit/security pieces are mostly portable. They move
  into Cloud Functions, so that investment is preserved, not discarded.

**What we consciously give up:** the heaviest "relational" reporting and some
data-residency control that PostgreSQL gives. My judgement: not needed at this stage,
and recoverable later if you scale. If your compliance posture (Vietnam **Decree 13**
on personal data) tightens, we can reintroduce the PostgreSQL engine for the
sensitive slices without redoing the apps.

> **This is the decision I need you to confirm.** Everything below is designed around
> Option A. If you prefer B, I'll re-shape the roadmap (it mainly changes Stages 2–3).

---

## 3. The shared data model — the heart of "interconnected"

Think of the data model as the **filing system** the whole company shares. Every
feature reads from and writes to these same files, and the files **reference each
other** — that cross-referencing is literally what makes the portals connected.

Below are the records ("**collections**") and, in plain English, how they link.

| Record | What it holds | How it connects to others |
|---|---|---|
| **Users** | One per person: name, email, **role** (student/teacher/admin/management/partner/parent). | The spine. Every other record points back to a User. |
| **Students** | The academic profile: ID, programme, intake, GPA, attendance %, fee balance. | Links to a User (who they are), a **Parent** (guardian), and the **Partner** who referred them. |
| **Teachers** | Staff profile: department, employment type, KPI score. | Links to a User; owns **Classes** and **AttendanceSessions**. |
| **Classes** _(new)_ | A course offering: subject, room, schedule, assigned teacher. | Links a Teacher to many Students via **Enrollments**. |
| **Enrollments** _(new)_ | "Student X is in Class Y." | The join that builds class rosters and timetables. |
| **AttendanceSessions** | A teacher opens a time-boxed check-in (with an **OTP** code). | Belongs to a Teacher + Class; collects AttendanceRecords. |
| **AttendanceRecords** | "Student X checked in to Session Z" (+ time, GPS, face-verified). | Updates the Student's attendance %; feeds management stats and parent alerts. |
| **Grades** | Assessment marks per student per class. | Feeds the Student's Results, the Parent's view, and academic KPIs. |
| **Invoices** | A bill: amount, due date, status (unpaid/paid/overdue). | Belongs to a Student; settled by **Payments**; drives Partner commissions + finance. |
| **Payments** _(new)_ | A real transaction via MoMo/VNPay/ZaloPay. | Marks an Invoice paid; confirmed by a payment **webhook**. |
| **Commissions** | A partner's earning for a referred student. | Links Partner + Student; status flips when the student's invoice is paid. |
| **LeaveRequests** | A teacher's time-off request. | Belongs to a Teacher; actioned by Admin/Management. |
| **Notifications** | Per-person alerts ("fee due", "grade posted"). | Generated automatically by the flows in §4. |
| **AuditLog** _(new)_ | A tamper-evident record of sensitive actions. | Touches everything; underpins compliance. |

New records I'm proposing to add — **Classes, Enrollments, Payments, AuditLog** — are
the "connective tissue" missing today. They're what let a teacher have a real roster,
a payment actually clear a bill, and every sensitive action be traceable.

A simple way to picture the links:

```
        Partner ──refers──▶ Student ◀──guardian── Parent
                               │
                        enrolled in
                               ▼
   Teacher ──teaches──▶  Class  ──has──▶ Enrollments ──▶ Students
      │                    │
      │ opens              │ generates
      ▼                    ▼
 AttendanceSession ──▶ AttendanceRecords ──updates──▶ Student attendance %
                                                          │
 Grades ──update──▶ Student Results ──visible to──▶ Parent + Management
                                                          │
 Invoice ──paid by──▶ Payment ──flips──▶ Commission + Finance + Notification
```

---

## 4. The interconnection map — features that trigger each other

This section is the "deeper and correlated within one another" you asked for. Each
flow is a **chain reaction**: one action, many portals updated. This is what we're
building.

**Flow 1 — Enrollment (Admin → everyone)**
Admin enrols a student → creates the Student, links Parent + referring Partner, and
auto-issues the first Invoice. Instantly: the student appears in the **Teacher's**
roster, **Management's** headcount and projected revenue, the **Partner's** "my
students" + a pending **Commission**, and the **Parent's** child profile.

**Flow 2 — Grading (Teacher → Student/Parent/Management)**
Teacher submits grades → the **Student's** Results update live, the **Parent** sees
the new mark, and **Management's** academic KPIs recalculate.

**Flow 3 — Attendance (Teacher + Student → everyone)**
Teacher opens an **OTP** session → Student checks in (web code, or on mobile with
**face + GPS** verification) → an AttendanceRecord is written → the Student's
attendance % updates, the Teacher sees live check-ins, **Management** sees attendance
rates, and the **Parent** gets an alert if the child is marked absent.

**Flow 4 — Billing & payment (Admin/Student → Finance/Partner)**
Invoice is raised → Student/Parent sees the fee → pays via **MoMo/VNPay/ZaloPay** →
the gateway calls our **webhook** to confirm → the Invoice flips to *paid*, the
Partner's **Commission** becomes payable, **Management's** revenue updates, and a
receipt **Notification** goes out.

**Flow 5 — Leave & coverage (Teacher → Admin/Management)**
Teacher requests leave → Admin/Management approve → affected classes are flagged for
cover.

**Flow 6 — The notification + audit fabric (cross-cutting)**
Every flow above automatically emits the right **Notifications** and writes an
**AuditLog** entry. These two threads run through all features and tie them together.

---

## 5. The roadmap — staged so each layer deepens the last

Built in order, web → backend → mobile, on **one shared data model**. Each stage
states its goal, what I build, which interconnections "switch on," and what *done*
looks like in plain English.

### Stage 0 — Foundation _(prerequisite for everything)_
- **Goal:** lock the backbone and the shared filing system.
- **I build:** confirm Option A; finalise the data model in §3 (add Classes,
  Enrollments, Payments, AuditLog); update the **security rules** and the **seeder**
  so the live project has realistic, connected sample data.
- **Switches on:** nothing user-facing yet — this is the foundation the rest stands on.
- **Done looks like:** a live project where the six demo users exist and the sample
  records already reference each other correctly.

### Stage 1 — The connected web app _(the visible leap)_
- **Goal:** retire mock data; all six portals read/write the **same live data**.
- **I build:** one shared data service (`HP_DATA`) the whole web app uses; convert
  each portal's screens to live **real-time** reads; implement Flows 1, 2, 3, 5, 6 on
  the web.
- **Switches on:** enrolment, grading, attendance, leave, notifications — all
  rippling across portals in real time.
- **Done looks like:** you enrol a student in the Admin portal and watch them appear
  in the Teacher, Management, Partner, and Parent portals **without refreshing**.

### Stage 2 — The money + trust engine _(Cloud Functions)_
- **Goal:** real payments and real compliance.
- **I build:** Cloud Functions for MoMo/VNPay/ZaloPay (port the existing gateway
  logic), the payment **webhooks** that confirm transactions, scheduled jobs
  (e.g. mark fees overdue, monthly commission roll-ups), the **AuditLog**, and
  role enforcement via secure **custom claims**. Implements Flow 4 end-to-end.
- **Switches on:** paying a fee actually clears the invoice, pays the partner, and
  moves the finance numbers — automatically.
- **Done looks like:** a sandbox payment on the web flips an invoice to *paid* and
  updates the partner + finance views on its own.

### Stage 3 — Mobile on the same backbone _(parity in your pocket)_
- **Goal:** the phone app uses the **same** data and functions as the web.
- **I build:** switch mobile to Firebase (login + live data); face/GPS attendance
  writes to the **same** AttendanceRecords; in-app payments call the **same**
  functions; **push notifications**; offline that syncs when back online.
- **Switches on:** a check-in on the phone updates the web instantly, and vice versa —
  truly one platform.
- **Done looks like:** a student checks in by face on mobile; the teacher's web
  screen shows it live.

### Stage 4 — Reporting, hardening & launch readiness
- **Goal:** make it trustworthy at scale.
- **I build:** real management dashboards from live aggregates; tighten security
  rules; automated **tests** (incl. the backend test helpers you mentioned);
  monitoring, backups, and a go-live checklist.
- **Done looks like:** dashboards reflect reality, tests pass in one command, and we
  have a documented launch runbook.

---

## 6. Cross-cutting foundations (apply to every stage)

- **Security & privacy (Decree 13):** least-privilege access rules per role; encrypt
  sensitive personal fields; the AuditLog for traceability; secrets kept out of the
  code.
- **Testing:** automated checks so a change in one flow can't silently break another —
  this is how we *keep* features safely interconnected as they grow.
- **Reliability:** backups, error monitoring, and safe "roll-back" if a release
  misbehaves.
- **Cost control:** Firebase usage alerts so spend stays predictable.

---

## 7. What I need from you (decisions & inputs)

1. **Approve the backbone:** confirm **Option A (Firebase-centric)** — or tell me you
   prefer B, and I'll re-shape Stages 2–3.
2. **Approve starting Stage 0 + 1** (foundation + connected web app) as the first
   build block.
3. **Payments:** when ready, your **sandbox/test** keys for MoMo, VNPay, ZaloPay
   (we build and test on sandbox first; real keys only at go-live).
4. **Branding/policy choices** (can come later): default currency display, languages
   (EN/VI already supported), and your data-retention preferences.

You do **not** need to provide anything technical to approve — just the green light on
1 and 2.

---

## 8. Risks & how I'll manage them

| Risk | Plain-English impact | Mitigation |
|---|---|---|
| Choosing the backbone late | Rework | Decide now (§2); everything keys off it. |
| Payment gateway specifics (VN) | Delays in Flow 4 | Build on sandbox early; isolate gateway code in Functions. |
| Security rules too loose/tight | Data exposure or users blocked | Stage 0 rules + Stage 4 tightening, with tests. |
| Scope creep ("a bit more everywhere") | Slips and half-finished features | Strict stage gates; each stage is shippable on its own. |
| Compliance bar rises | Re-architecture fear | Model is store-agnostic; sensitive slices can move to PostgreSQL later without redoing the apps. |

---

## 9. Plain-English glossary

- **Firebase** — Google's cloud service that handles user logins and a live database,
  with no servers for you to run.
- **Backend** — the "engine room": the server-side programs and database that the apps
  talk to.
- **Cloud Functions** — small programs Google runs on demand (e.g. to confirm a
  payment). Our "server code" without a server to manage.
- **Collection / record** — a labelled drawer of similar items (e.g. all Invoices) and
  one item inside it.
- **Real-time** — screens update by themselves the instant data changes.
- **OTP** — a short one-time code (here, for attendance check-in).
- **Webhook** — an automatic phone-call from the payment company to our system saying
  "this payment succeeded."
- **Custom claims** — a secure stamp on a user's login that says their role, so the
  system can trust it.
- **Audit log** — a tamper-evident diary of sensitive actions, for trust and
  compliance.
- **Decree 13** — Vietnam's personal-data protection law we design around.
- **Sandbox** — a safe "play money" mode for testing payments before real money.

---

## 10. Immediate next step

If you approve **Option A** and **starting Stages 0–1**, I'll begin by building the
shared live data system and converting the web app's six portals to it — so within
the first block you can *see* an action in one portal ripple into the others.

**Reply "approved" (or tell me which parts to change), and I'll start building.**
