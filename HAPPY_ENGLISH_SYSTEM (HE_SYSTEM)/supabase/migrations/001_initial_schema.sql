-- =============================================================================
-- HE-SYSTEM — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Supabase PostgreSQL — Run via: npx supabase db push
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin', 'management', 'partner', 'parent');
CREATE TYPE class_type AS ENUM ('campus', 'remote', 'home');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE payment_method AS ENUM ('card', 'bank_transfer', 'ewallet', 'cash', 'wallet');
CREATE TYPE commission_status AS ENUM ('pending', 'approved', 'paid', 'cancelled');
CREATE TYPE payout_status AS ENUM ('requested', 'processing', 'completed', 'rejected');
CREATE TYPE partner_tier AS ENUM ('starter', 'bronze', 'silver', 'gold', 'platinum');
CREATE TYPE notification_channel AS ENUM ('push', 'sms', 'email', 'in_app');
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
CREATE TYPE kpi_period AS ENUM ('monthly', 'quarterly', 'annual');
CREATE TYPE recruit_status AS ENUM ('prospect', 'applied', 'enrolled', 'dropped');

-- =============================================================================
-- CORE SYSTEM TABLES
-- =============================================================================

-- Institutions (multi-tenant root)
CREATE TABLE institutions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  name_vi         TEXT,                          -- Vietnamese name
  slug            TEXT UNIQUE NOT NULL,
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#1B3D8C',
  accent_color    TEXT DEFAULT '#DC2626',
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  timezone        TEXT DEFAULT 'Asia/Kuala_Lumpur',
  currency        TEXT DEFAULT 'MYR',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Users (extends Supabase auth.users)
CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  role            user_role NOT NULL,
  full_name       TEXT NOT NULL,
  display_name    TEXT,
  email           TEXT NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  preferred_lang  TEXT DEFAULT 'en',            -- 'en' or 'vi'
  fcm_token       TEXT,                          -- Firebase push token
  expo_push_token TEXT,                          -- Expo push token
  is_active       BOOLEAN DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Departments
CREATE TABLE departments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  name            TEXT NOT NULL,
  name_vi         TEXT,
  code            TEXT NOT NULL,
  head_user_id    UUID REFERENCES users(id),
  budget_allocated NUMERIC(12,2) DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, code)
);

-- Programmes (courses)
CREATE TABLE programmes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  department_id   UUID REFERENCES departments(id),
  name            TEXT NOT NULL,
  name_vi         TEXT,
  code            TEXT NOT NULL,
  description     TEXT,
  duration_months INT,
  fee_amount      NUMERIC(10,2),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, code)
);

-- Subjects
CREATE TABLE subjects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  programme_id    UUID REFERENCES programmes(id),
  name            TEXT NOT NULL,
  name_vi         TEXT,
  code            TEXT NOT NULL,
  credit_hours    NUMERIC(4,1),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ACADEMIC TABLES
-- =============================================================================

-- Students (extended profile)
CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  programme_id    UUID REFERENCES programmes(id),
  student_number  TEXT NOT NULL,
  intake_date     DATE,
  expected_grad   DATE,
  nationality     TEXT,
  passport_number TEXT,
  emgs_status     TEXT,                          -- international student pass
  home_address    TEXT,
  home_lat        NUMERIC(10,7),
  home_lng        NUMERIC(10,7),
  emergency_name  TEXT,
  emergency_phone TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, student_number)
);

-- Teachers (extended profile)
CREATE TABLE teachers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  department_id   UUID REFERENCES departments(id),
  employee_number TEXT NOT NULL,
  specializations TEXT[],
  max_hours_month INT DEFAULT 80,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, employee_number)
);

-- Staff (admin/support)
CREATE TABLE staff (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  department_id   UUID REFERENCES departments(id),
  employee_number TEXT NOT NULL,
  position        TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, employee_number)
);

-- Classes (individual sessions)
CREATE TABLE classes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  subject_id      UUID NOT NULL REFERENCES subjects(id),
  teacher_id      UUID NOT NULL REFERENCES teachers(id),
  class_type      class_type NOT NULL DEFAULT 'campus',
  title           TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  -- Campus/home fields
  location_name   TEXT,
  location_address TEXT,
  location_lat    NUMERIC(10,7),
  location_lng    NUMERIC(10,7),
  room_number     TEXT,
  -- Remote fields
  join_url        TEXT,
  meeting_id      TEXT,
  meeting_password TEXT,
  -- Attendance OTP
  otp_code        TEXT,
  otp_expires_at  TIMESTAMPTZ,
  is_cancelled    BOOLEAN DEFAULT FALSE,
  cancel_reason   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Class Enrollments
CREATE TABLE class_enrollments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id        UUID NOT NULL REFERENCES classes(id),
  student_id      UUID NOT NULL REFERENCES students(id),
  enrolled_at     TIMESTAMPTZ DEFAULT NOW(),
  is_active       BOOLEAN DEFAULT TRUE,
  UNIQUE(class_id, student_id)
);

-- Attendance Records
CREATE TABLE attendance_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  class_id        UUID NOT NULL REFERENCES classes(id),
  student_id      UUID NOT NULL REFERENCES students(id),
  status          attendance_status NOT NULL DEFAULT 'absent',
  marked_at       TIMESTAMPTZ,
  marked_by       UUID REFERENCES users(id),    -- teacher or OTP self-mark
  otp_used        BOOLEAN DEFAULT FALSE,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

-- Exam Results
CREATE TABLE exam_results (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  student_id      UUID NOT NULL REFERENCES students(id),
  subject_id      UUID NOT NULL REFERENCES subjects(id),
  teacher_id      UUID REFERENCES teachers(id),
  assessment_name TEXT NOT NULL,
  assessment_type TEXT,                          -- 'exam', 'quiz', 'assignment', 'project'
  score           NUMERIC(6,2),
  max_score       NUMERIC(6,2),
  grade           TEXT,
  is_published    BOOLEAN DEFAULT FALSE,
  exam_date       DATE,
  remarks         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Timetables
CREATE TABLE timetables (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  programme_id    UUID REFERENCES programmes(id),
  class_id        UUID REFERENCES classes(id),
  day_of_week     SMALLINT,                      -- 0=Mon, 6=Sun
  start_time      TIME,
  end_time        TIME,
  effective_from  DATE,
  effective_until DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FINANCE TABLES
-- =============================================================================

-- Fee Invoices
CREATE TABLE fee_invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  invoice_number  TEXT NOT NULL,
  student_id      UUID NOT NULL REFERENCES students(id),
  programme_id    UUID REFERENCES programmes(id),
  amount          NUMERIC(10,2) NOT NULL,
  amount_paid     NUMERIC(10,2) DEFAULT 0,
  currency        TEXT DEFAULT 'MYR',
  status          invoice_status DEFAULT 'draft',
  issued_date     DATE,
  due_date        DATE,
  paid_date       DATE,
  description     TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, invoice_number)
);

-- Fee Payments
CREATE TABLE fee_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  invoice_id      UUID NOT NULL REFERENCES fee_invoices(id),
  student_id      UUID NOT NULL REFERENCES students(id),
  amount          NUMERIC(10,2) NOT NULL,
  method          payment_method NOT NULL,
  reference_number TEXT,
  stripe_payment_intent_id TEXT,
  paid_at         TIMESTAMPTZ DEFAULT NOW(),
  receipt_url     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Digital Wallets
CREATE TABLE digital_wallets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id),
  balance         NUMERIC(10,2) DEFAULT 0,
  currency        TEXT DEFAULT 'MYR',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet Transactions
CREATE TABLE wallet_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id       UUID NOT NULL REFERENCES digital_wallets(id),
  type            TEXT NOT NULL,                 -- 'topup', 'spend', 'refund', 'payout'
  amount          NUMERIC(10,2) NOT NULL,
  balance_after   NUMERIC(10,2) NOT NULL,
  description     TEXT,
  reference_id    UUID,                          -- invoice_id or payout_id
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Departmental Budgets
CREATE TABLE budgets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  department_id   UUID NOT NULL REFERENCES departments(id),
  period_year     SMALLINT NOT NULL,
  period_quarter  SMALLINT,                      -- 1-4, NULL = annual
  allocated       NUMERIC(12,2) NOT NULL,
  spent           NUMERIC(12,2) DEFAULT 0,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses
CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  budget_id       UUID REFERENCES budgets(id),
  department_id   UUID REFERENCES departments(id),
  submitted_by    UUID NOT NULL REFERENCES users(id),
  approved_by     UUID REFERENCES users(id),
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT DEFAULT 'MYR',
  category        TEXT,
  description     TEXT NOT NULL,
  receipt_url     TEXT,
  status          expense_status DEFAULT 'pending',
  expense_date    DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PARTNER / AFFILIATE TABLES
-- =============================================================================

-- Partners
CREATE TABLE partners (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  company_name    TEXT,
  referral_code   TEXT UNIQUE NOT NULL,
  tier            partner_tier DEFAULT 'starter',
  total_recruited INT DEFAULT 0,
  total_earned    NUMERIC(12,2) DEFAULT 0,
  bank_name       TEXT,
  bank_account    TEXT,
  bank_holder     TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Partner Recruits (students brought in by a partner)
CREATE TABLE partner_recruits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  partner_id      UUID NOT NULL REFERENCES partners(id),
  student_id      UUID REFERENCES students(id),
  student_name    TEXT,                          -- before student account created
  student_email   TEXT,
  programme_id    UUID REFERENCES programmes(id),
  status          recruit_status DEFAULT 'prospect',
  enrolled_at     TIMESTAMPTZ,
  tuition_fee     NUMERIC(10,2),
  referral_code   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Partner Commissions
CREATE TABLE partner_commissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  partner_id      UUID NOT NULL REFERENCES partners(id),
  recruit_id      UUID NOT NULL REFERENCES partner_recruits(id),
  students_at_time INT NOT NULL,                 -- snapshot of total_recruited at calculation time
  commission_pct  NUMERIC(5,2) NOT NULL,
  tuition_fee     NUMERIC(10,2) NOT NULL,
  amount_earned   NUMERIC(10,2) NOT NULL,
  tier_at_time    partner_tier NOT NULL,
  status          commission_status DEFAULT 'pending',
  calculated_at   TIMESTAMPTZ DEFAULT NOW(),
  approved_at     TIMESTAMPTZ,
  approved_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Partner Payouts
CREATE TABLE partner_payouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  partner_id      UUID NOT NULL REFERENCES partners(id),
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT DEFAULT 'MYR',
  status          payout_status DEFAULT 'requested',
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  processed_by    UUID REFERENCES users(id),
  bank_reference  TEXT,
  receipt_url     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- KPI TABLES
-- =============================================================================

-- KPI Targets (per role / institution)
CREATE TABLE kpi_targets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  role            user_role NOT NULL,
  pillar          TEXT NOT NULL,
  metric          TEXT NOT NULL,
  weight_in_pillar NUMERIC(5,2),
  pillar_weight   NUMERIC(5,2),
  target_value    NUMERIC(10,2),
  period          kpi_period DEFAULT 'monthly',
  effective_from  DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- KPI Records (monthly scores per user)
CREATE TABLE kpi_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  period_year     SMALLINT NOT NULL,
  period_month    SMALLINT NOT NULL,             -- 1-12
  -- Teacher pillars
  pillar1_score   NUMERIC(5,2),                 -- Teaching Hours & Attendance
  pillar2_score   NUMERIC(5,2),                 -- Student Outcomes
  pillar3_score   NUMERIC(5,2),                 -- Admin Tasks
  pillar4_score   NUMERIC(5,2),                 -- R&D
  -- Overall
  total_score     NUMERIC(5,2),
  grade           TEXT,                          -- A/B/C/D/F
  -- Raw data snapshot
  teaching_hours  NUMERIC(6,1),
  classes_conducted INT,
  attendance_rate NUMERIC(5,2),
  pass_rate       NUMERIC(5,2),
  tasks_completed INT,
  tasks_total     INT,
  training_hours  NUMERIC(5,1),
  calculated_at   TIMESTAMPTZ DEFAULT NOW(),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, user_id, period_year, period_month)
);

-- Payroll Records (read-only view for staff)
CREATE TABLE payroll_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  period_year     SMALLINT NOT NULL,
  period_month    SMALLINT NOT NULL,
  base_salary     NUMERIC(10,2) NOT NULL,
  allowances      NUMERIC(10,2) DEFAULT 0,
  deductions      NUMERIC(10,2) DEFAULT 0,
  kpi_bonus       NUMERIC(10,2) DEFAULT 0,
  net_pay         NUMERIC(10,2) NOT NULL,
  slip_url        TEXT,
  paid_at         DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, user_id, period_year, period_month)
);

-- =============================================================================
-- COMMUNICATION TABLES
-- =============================================================================

-- Messages (direct messaging)
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  sender_id       UUID NOT NULL REFERENCES users(id),
  recipient_id    UUID NOT NULL REFERENCES users(id),
  content         TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  channel         notification_channel DEFAULT 'in_app',
  is_read         BOOLEAN DEFAULT FALSE,
  action_url      TEXT,
  reference_type  TEXT,                          -- 'invoice', 'attendance', 'kpi', etc.
  reference_id    UUID,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements
CREATE TABLE announcements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  created_by      UUID NOT NULL REFERENCES users(id),
  title           TEXT NOT NULL,
  title_vi        TEXT,
  body            TEXT NOT NULL,
  body_vi         TEXT,
  target_roles    user_role[],                   -- NULL = all roles
  is_published    BOOLEAN DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Parent-Student Links
CREATE TABLE parent_student_links (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  parent_user_id  UUID NOT NULL REFERENCES users(id),
  student_id      UUID NOT NULL REFERENCES students(id),
  relationship    TEXT DEFAULT 'parent',
  is_primary      BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_user_id, student_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_users_institution ON users(institution_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_students_institution ON students(institution_id);
CREATE INDEX idx_students_programme ON students(programme_id);
CREATE INDEX idx_teachers_institution ON teachers(institution_id);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_subject ON classes(subject_id);
CREATE INDEX idx_classes_starts_at ON classes(starts_at);
CREATE INDEX idx_attendance_class ON attendance_records(class_id);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
CREATE INDEX idx_exam_results_student ON exam_results(student_id);
CREATE INDEX idx_fee_invoices_student ON fee_invoices(student_id);
CREATE INDEX idx_fee_invoices_status ON fee_invoices(status);
CREATE INDEX idx_partner_recruits_partner ON partner_recruits(partner_id);
CREATE INDEX idx_partner_commissions_partner ON partner_commissions(partner_id);
CREATE INDEX idx_kpi_records_user ON kpi_records(user_id);
CREATE INDEX idx_kpi_records_period ON kpi_records(period_year, period_month);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_messages_recipient ON messages(recipient_id, is_read);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- =============================================================================
-- TRIGGERS — updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'institutions','users','departments','programmes','subjects',
    'students','teachers','staff','classes','exam_results',
    'fee_invoices','digital_wallets','budgets','expenses',
    'partners','partner_recruits','partner_payouts',
    'announcements'
  ] LOOP
    EXECUTE format('
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at();
    ', tbl);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGER — partner tier update
-- =============================================================================

CREATE OR REPLACE FUNCTION update_partner_tier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tier := CASE
    WHEN NEW.total_recruited >= 61 THEN 'platinum'::partner_tier
    WHEN NEW.total_recruited >= 31 THEN 'gold'::partner_tier
    WHEN NEW.total_recruited >= 16 THEN 'silver'::partner_tier
    WHEN NEW.total_recruited >= 6  THEN 'bronze'::partner_tier
    ELSE 'starter'::partner_tier
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_partner_tier
BEFORE UPDATE OF total_recruited ON partners
FOR EACH ROW EXECUTE PROCEDURE update_partner_tier();

-- =============================================================================
-- TRIGGER — wallet balance cannot go negative
-- =============================================================================

CREATE OR REPLACE FUNCTION check_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.balance < 0 THEN
    RAISE EXCEPTION 'Wallet balance cannot be negative';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallet_no_negative
BEFORE UPDATE OF balance ON digital_wallets
FOR EACH ROW EXECUTE PROCEDURE check_wallet_balance();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'institutions','users','departments','programmes','subjects',
    'students','teachers','staff','classes','class_enrollments',
    'attendance_records','exam_results','timetables',
    'fee_invoices','fee_payments','digital_wallets','wallet_transactions',
    'budgets','expenses',
    'partners','partner_recruits','partner_commissions','partner_payouts',
    'kpi_targets','kpi_records','payroll_records',
    'messages','notifications','announcements','parent_student_links'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Helper function: get current user's institution_id
CREATE OR REPLACE FUNCTION get_my_institution_id()
RETURNS UUID AS $$
  SELECT institution_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is current user admin or above
CREATE OR REPLACE FUNCTION is_admin_or_above()
RETURNS BOOLEAN AS $$
  SELECT role IN ('admin', 'management') FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── users: everyone sees own row; admin/management sees institution ──
CREATE POLICY "users: own row" ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users: institution view for admin" ON users FOR SELECT
  USING (
    institution_id = get_my_institution_id()
    AND is_admin_or_above()
  );

CREATE POLICY "users: update own" ON users FOR UPDATE
  USING (id = auth.uid());

-- ── students: student sees own; teacher/admin/management sees institution ──
CREATE POLICY "students: own record" ON students FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "students: institution view" ON students FOR SELECT
  USING (
    institution_id = get_my_institution_id()
    AND get_my_role() IN ('teacher', 'admin', 'management')
  );

CREATE POLICY "students: admin CRUD" ON students FOR ALL
  USING (
    institution_id = get_my_institution_id()
    AND is_admin_or_above()
  );

-- ── classes: everyone in institution can read ──
CREATE POLICY "classes: institution read" ON classes FOR SELECT
  USING (institution_id = get_my_institution_id());

CREATE POLICY "classes: teacher own classes" ON classes FOR UPDATE
  USING (
    institution_id = get_my_institution_id()
    AND teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

CREATE POLICY "classes: admin manage" ON classes FOR ALL
  USING (
    institution_id = get_my_institution_id()
    AND is_admin_or_above()
  );

-- ── attendance: student sees own; teacher marks own classes ──
CREATE POLICY "attendance: student own" ON attendance_records FOR SELECT
  USING (
    institution_id = get_my_institution_id()
    AND student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "attendance: parent sees child" ON attendance_records FOR SELECT
  USING (
    institution_id = get_my_institution_id()
    AND student_id IN (
      SELECT student_id FROM parent_student_links WHERE parent_user_id = auth.uid()
    )
  );

CREATE POLICY "attendance: teacher mark" ON attendance_records FOR ALL
  USING (
    institution_id = get_my_institution_id()
    AND class_id IN (
      SELECT id FROM classes WHERE teacher_id IN (
        SELECT id FROM teachers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "attendance: admin all" ON attendance_records FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- ── exam_results: student/parent see own; teacher enters own; admin all ──
CREATE POLICY "results: student own" ON exam_results FOR SELECT
  USING (
    institution_id = get_my_institution_id()
    AND student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "results: parent child" ON exam_results FOR SELECT
  USING (
    institution_id = get_my_institution_id()
    AND student_id IN (
      SELECT student_id FROM parent_student_links WHERE parent_user_id = auth.uid()
    )
  );

CREATE POLICY "results: teacher insert update" ON exam_results FOR ALL
  USING (
    institution_id = get_my_institution_id()
    AND teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

CREATE POLICY "results: admin all" ON exam_results FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- ── fee_invoices: student/parent own; admin all ──
CREATE POLICY "invoices: student own" ON fee_invoices FOR SELECT
  USING (
    institution_id = get_my_institution_id()
    AND student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "invoices: parent child" ON fee_invoices FOR SELECT
  USING (
    institution_id = get_my_institution_id()
    AND student_id IN (
      SELECT student_id FROM parent_student_links WHERE parent_user_id = auth.uid()
    )
  );

CREATE POLICY "invoices: admin all" ON fee_invoices FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- ── digital_wallets: user sees own ──
CREATE POLICY "wallets: own" ON digital_wallets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "wallets: admin" ON digital_wallets FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- ── partner_commissions / recruits: partner sees own; admin all ──
CREATE POLICY "partner_recruits: own" ON partner_recruits FOR SELECT
  USING (
    institution_id = get_my_institution_id()
    AND partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

CREATE POLICY "partner_recruits: admin" ON partner_recruits FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

CREATE POLICY "partner_commissions: own" ON partner_commissions FOR SELECT
  USING (
    institution_id = get_my_institution_id()
    AND partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

CREATE POLICY "partner_commissions: admin" ON partner_commissions FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- ── kpi_records: own row; management sees all ──
CREATE POLICY "kpi: own" ON kpi_records FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "kpi: management" ON kpi_records FOR SELECT
  USING (
    institution_id = get_my_institution_id()
    AND get_my_role() = 'management'
  );

CREATE POLICY "kpi: admin insert" ON kpi_records FOR INSERT
  WITH CHECK (institution_id = get_my_institution_id() AND is_admin_or_above());

-- ── payroll: own row only ──
CREATE POLICY "payroll: own" ON payroll_records FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "payroll: management" ON payroll_records FOR SELECT
  USING (
    institution_id = get_my_institution_id()
    AND get_my_role() = 'management'
  );

-- ── notifications: own ──
CREATE POLICY "notifications: own" ON notifications FOR ALL
  USING (user_id = auth.uid());

-- ── messages: sender or recipient ──
CREATE POLICY "messages: own" ON messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "messages: send" ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "messages: read own" ON messages FOR UPDATE
  USING (recipient_id = auth.uid());

-- ── announcements: institution read; admin write ──
CREATE POLICY "announcements: read published" ON announcements FOR SELECT
  USING (
    institution_id = get_my_institution_id()
    AND is_published = TRUE
  );

CREATE POLICY "announcements: admin all" ON announcements FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- =============================================================================
-- SEED — default institution (placeholder)
-- =============================================================================

INSERT INTO institutions (name, name_vi, slug, primary_color, accent_color, timezone, currency)
VALUES (
  'Happy English',
  'Anh Ngữ Happy',
  'happy-english',
  '#1B3D8C',
  '#DC2626',
  'Asia/Ho_Chi_Minh',
  'VND'
);
