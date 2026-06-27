# HE-SYSTEM — Full System Blueprint
**Happy English Learning Management & Operations Platform**
*Version 1.0 — June 2026*

---

## 1. System Overview

HE-SYSTEM is a full-stack learning management and operations platform built for educational institutions (colleges and secondary schools). It replaces and significantly improves upon APSpace (APU's portal) by adding:

- Teacher & staff KPI tracking
- Full financial management suite
- Partner/affiliate program with auto-scaling commission formula
- Parent portal
- Class location map (remote / campus / home)
- Bilingual support (English + Vietnamese)

**Platforms:** Web (browser) + Mobile (iOS & Android) — full parity  
**Languages:** English, Vietnamese  
**Architecture:** Multi-tenant, role-based, real-time

---

## 2. User Portals (6 Roles)

### 2.1 Student Portal
| Module | Description |
|--------|-------------|
| Dashboard | Personalized widgets — attendance %, upcoming classes, fee balance, notifications |
| Attendance | OTP-based marking system (AttendiX-style), per-subject breakdown, eligibility alerts |
| Timetable | Hybrid schedule showing Remote / Campus / Home classes with map links |
| Results & Grades | Exam results, grade progress, historical academic record |
| Fee Management | Outstanding fees, payment history, online payment, instalment plans |
| E-Wallet | Digital wallet (campus spending), top-up, transaction history |
| Location | Interactive map showing class location with navigation, class type badge |
| Notifications | Push alerts for attendance, fees, results, announcements |
| Teacher Directory | Search and message teachers via in-app chat |
| Student Pass | International student EMGS pass tracking |
| Profile | Personal info, programme details, emergency contacts |

### 2.2 Teacher / Lecturer Portal
| Module | Description |
|--------|-------------|
| KPI Dashboard | Live view of all 4 KPI pillars — Teaching Hours, Student Outcomes, Admin Tasks, R&D |
| Attendance OTP | Generate OTP for class check-in, view class attendance records |
| Grade Entry | Enter and publish student grades, download grade sheets |
| Timetable | View and manage personal teaching schedule |
| Student Progress | Per-student progress tracker linked to teacher's classes |
| Marking Deadlines | Task list for upcoming marking, reports, submissions |
| Communication | Message students and parents directly |
| R&D Log | Log certifications, training hours, professional development activities |
| Leave Management | Submit and track leave applications |
| Reports | Submit academic and admin reports |

### 2.3 Admin / Support Staff Portal
| Module | Description |
|--------|-------------|
| KPI Dashboard | Personal KPI tracking (punctuality, task completion, quality) |
| Student Enrolment | Manage student registrations, status changes, documents |
| Fee Invoicing | Generate and send fee invoices, track payments, send reminders |
| Partner Management | Add partners, view commission, approve payouts |
| Timetable Builder | Create and publish class timetables for all programmes |
| Staff Directory | Full directory with contact details and roles |
| Task Management | Assign, track, and complete administrative tasks |
| Document Management | Upload, organise, share institutional documents |
| Notification Centre | Broadcast announcements to students / parents / staff |

### 2.4 Management / Leadership Portal
| Module | Description |
|--------|-------------|
| KPI Overview | Full institution KPI dashboard — all teachers and staff in one view |
| Financial Dashboard | Revenue, outstanding fees, budget burn, commission paid out |
| Enrolment Analytics | Total students, by programme, by intake, by partner source |
| Partner Report | Commission paid, top-performing partners, revenue attributed to partners |
| Department Budgets | Per-department budget vs actual spend |
| Teacher Performance | Ranked teacher performance report, flagging underperformers |
| Attendance Analytics | Institution-wide attendance trends, at-risk students |
| Revenue vs Target | Monthly revenue tracking against targets, forecast view |
| Alerts & Escalations | System-generated alerts for critical thresholds |
| Export Centre | Export any report as CSV / PDF |

### 2.5 Partner / Affiliate Portal
| Module | Description |
|--------|-------------|
| My Students | List of all students recruited, their enrolment status, intake |
| Commission Tracker | Live commission earned, formula breakdown, monthly totals |
| Tier & Rank | Current tier (Starter → Bronze → Silver → Gold → Platinum), progress bar |
| Next Milestone | Preview of earnings at next tier, students needed to level up |
| Payout History | All past commission payments, dates, amounts |
| Leaderboard | Optional — see ranking vs other partners (can be anonymised) |
| Referral Link | Unique referral URL and QR code to share with prospects |
| Payout Request | Submit payout request, track approval status |
| Formula Explainer | Transparent breakdown of how their commission is calculated |
| Profile & Banking | Manage payout bank account / e-wallet details |

### 2.6 Parent Portal
| Module | Description |
|--------|-------------|
| Attendance Records | Child's attendance per subject, percentage, alerts for low attendance |
| Attendance Alerts | Push notification + SMS when child misses a class |
| Academic Results | Exam results, grades, progress over time |
| Fee Management | View outstanding fees, pay online on behalf of child |
| Payment History | Receipt access for all fee payments made |
| Teacher Communication | Direct message to child's teachers |
| Class Location | Map showing where each class is (campus / remote / home visit) |
| Notifications | All school communications in one feed |
| Multi-Child Support | Switch between multiple children in one account |

---

## 3. KPI System

### 3.1 Teacher KPI Framework (4 Pillars)

#### Pillar 1: Teaching Hours & Attendance (25%)
- Classes conducted on time — 35%
- Teaching hours vs target — 25%
- Teacher punctuality rate — 20%
- Leave usage vs quota — 10%
- Class cancellation rate — 10%

#### Pillar 2: Student Outcomes (35%)
- Class pass rate — 30%
- Student satisfaction score — 25%
- Student attendance in class — 20%
- Grade distribution (A/B/C ratio) — 15%
- Repeat / remedial students — 10%

#### Pillar 3: Administrative Tasks (25%)
- Marking submitted on time — 30%
- Reports submitted on time — 25%
- Meeting attendance rate — 20%
- Compliance tasks completed — 15%
- Student feedback responses — 10%

#### Pillar 4: Research & Development (15%)
- Training hours completed — 30%
- Certifications earned — 25%
- Professional development activities — 20%
- Course materials updated — 15%
- Publications / contributions — 10%

### 3.2 Admin/Staff KPI Framework (2 Pillars)

#### Pillar 1: Attendance & Punctuality (50%)
- Daily check-in on time — 40%
- Leave vs quota — 30%
- Meeting attendance — 30%

#### Pillar 2: Task Completion (50%)
- Tasks completed on deadline — 40%
- Escalations resolved — 30%
- Quality score (manager rating) — 30%

---

## 4. Partner Commission Formula

### Auto-Scaling Formula
```
Commission % = min(35%, 8% + (Students Recruited × 0.4%))
```

### Tier Breakdown
| Tier | Students | Commission % | Bonus Perks |
|------|----------|-------------|-------------|
| ⚪ Starter | 1 – 5 | 8.4% – 10% | Basic partner badge |
| 🥉 Bronze | 6 – 15 | 10.4% – 14% | Monthly digest + priority support |
| 🥈 Silver | 16 – 30 | 14.4% – 20% | Co-marketing materials + early access |
| 🥇 Gold | 31 – 60 | 20.4% – 32% | Dedicated manager + RM500 milestone bonus |
| 💎 Platinum | 61+ | 35% (capped) | Revenue share + annual gala + premium badge |

### Example Calculations
- 10 students @ RM1,000 tuition = 12% commission = **RM1,200**
- 25 students @ RM1,000 tuition = 18% commission = **RM4,500**
- 50 students @ RM1,000 tuition = 28% commission = **RM14,000**
- 75 students @ RM1,000 tuition = 35% commission = **RM26,250**

---

## 5. Financial Management System

### 5.1 Student Fee Management
- Automated invoicing per intake/programme
- Online payment: credit/debit card, bank transfer, e-wallet
- Overdue alerts via push notification and SMS
- Instalment plan configuration
- Fee statement download (PDF)
- E-wallet (digital campus card)

### 5.2 Partner Commission Payouts
- Auto-calculation on student enrolment events
- Payout request → admin approval → bank transfer workflow
- Payout history and tax receipt generation

### 5.3 Staff Payroll View (Read-Only)
- Monthly salary slip
- Allowances and deductions breakdown
- Performance bonus tracking

### 5.4 Departmental Budget Tracking
- Budget vs actual spend in real time
- Expense submission and approval workflow
- Monthly burn rate chart

### 5.5 Management Revenue Analytics
- Total enrolment revenue live
- Revenue by course / programme
- Revenue attributed by partner source
- Monthly / quarterly P&L summary
- Revenue forecast vs target

### 5.6 Digital Wallet (Campus)
- Top-up via online banking
- Use for canteen, printing, campus services
- Transaction history with filters

---

## 6. Location System

| Type | Map | Navigation | Notes |
|------|-----|-----------|-------|
| 🏫 Campus / Office | Yes | Yes | Building & room shown |
| 💻 Remote / Online | No | One-tap join link | Video link shown at class time |
| 🏠 Student's Home | Yes | Yes (for teacher) | Privacy controls — only teacher sees full address |

---

## 7. Technology Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Mobile | Expo React Native (iOS + Android) |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Edge Functions | Deno (Supabase Edge Functions) |
| Auth | Supabase Auth + JWT + RLS |
| Payments | Stripe |
| Push Notifications | Expo Push + Firebase FCM |
| SMS | Twilio |
| Email | Resend |
| Maps | Google Maps |
| Monorepo | Turborepo + pnpm |
| Web Deployment | Vercel |
| Mobile Deployment | EAS (Expo Application Services) |

---

## 8. What Makes HE-SYSTEM Better Than APSpace

| Feature | APSpace | HE-SYSTEM |
|---------|---------|-----------|
| Teacher KPI system | ✗ | ✓ Full 4-pillar framework |
| Staff KPI system | ✗ | ✓ Attendance + task completion |
| Partner affiliate program | ✗ | ✓ Auto-scaling tiered commission |
| Parent portal | ✗ | ✓ Full portal with alerts + payment |
| Class location map | ✗ | ✓ 3 types + navigation |
| Hybrid class management | ✗ | ✓ Remote / Campus / Home |
| Department budget tracking | ✗ | ✓ Real-time budget vs spend |
| Management analytics | Limited | ✓ Revenue, KPI, enrolment, partners |
| Multi-language | English only | ✓ English + Vietnamese |
| Multi-campus ready | No | ✓ Yes, from day one |

---

## 9. Recommended Build Phases

### Phase 1 — Core Academic Platform (Months 1–3)
- Student portal (attendance, timetable, results, fees)
- Teacher portal (KPI, attendance OTP, grades)
- Admin portal (enrolment, timetable builder)
- Authentication + RBAC

### Phase 2 — Finance & Partner System (Months 4–5)
- Full financial suite
- Partner portal + commission engine
- Payout workflow
- Parent portal

### Phase 3 — Analytics & Optimization (Month 6)
- Management analytics dashboard
- Location system
- KPI reporting for management
- Vietnamese language pack
- Mobile app (iOS + Android)

---

*Document generated by HE-SYSTEM Blueprint Session — June 2026*
