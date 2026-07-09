-- =============================================================================
-- HE-SYSTEM — Missing RLS Policies + Function Hardening
-- Migration: 003_missing_rls_policies.sql
--
-- AUDIT FIX: after provisioning a live Supabase project and running the
-- security advisor for the first time, it flagged 16 tables that had RLS
-- enabled (by migration 001's blanket ENABLE ROW LEVEL SECURITY loop, or by
-- this project's own rls_auto_enable event trigger) but NO policies at all.
-- With RLS on and no policy, Postgres denies every row to every non-service
-- role by default — which silently broke several already-built dashboard
-- queries that were never caught because no live database existed to test
-- against until now:
--   - partner dashboard's own-partner-row lookup (`partners`)
--   - parent dashboard's `parent_student_links` query
--   - management dashboard's `fee_payments` revenue query
--   - student/teacher dashboards' `class_enrollments` / `teachers` / `staff`
--     / `subjects` / `programmes` reads
-- None of these errored — RLS just filtered results down to zero rows, so
-- every affected widget quietly showed "no data" instead of failing loudly.
-- This migration adds the policies that should have shipped with 001.
-- =============================================================================

-- institutions: members can read their own institution's public info
CREATE POLICY "institutions: own institution read" ON institutions FOR SELECT
  USING (id = get_my_institution_id());
CREATE POLICY "institutions: admin manage" ON institutions FOR ALL
  USING (id = get_my_institution_id() AND is_admin_or_above());

-- departments
CREATE POLICY "departments: institution read" ON departments FOR SELECT
  USING (institution_id = get_my_institution_id());
CREATE POLICY "departments: admin manage" ON departments FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- programmes
CREATE POLICY "programmes: institution read" ON programmes FOR SELECT
  USING (institution_id = get_my_institution_id());
CREATE POLICY "programmes: admin manage" ON programmes FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- subjects
CREATE POLICY "subjects: institution read" ON subjects FOR SELECT
  USING (institution_id = get_my_institution_id());
CREATE POLICY "subjects: admin manage" ON subjects FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- teachers
CREATE POLICY "teachers: own row" ON teachers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "teachers: institution view" ON teachers FOR SELECT
  USING (institution_id = get_my_institution_id() AND get_my_role() IN ('admin', 'management'));
CREATE POLICY "teachers: admin manage" ON teachers FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- staff
CREATE POLICY "staff: own row" ON staff FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "staff: admin manage" ON staff FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- timetables
CREATE POLICY "timetables: institution read" ON timetables FOR SELECT
  USING (institution_id = get_my_institution_id());
CREATE POLICY "timetables: admin manage" ON timetables FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- class_enrollments: student sees own enrollments; teacher sees enrollments
-- in their own classes; admin sees all in the institution
CREATE POLICY "class_enrollments: student own" ON class_enrollments FOR SELECT
  USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "class_enrollments: teacher own classes" ON class_enrollments FOR SELECT
  USING (class_id IN (SELECT id FROM classes WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())));
CREATE POLICY "class_enrollments: admin manage" ON class_enrollments FOR ALL
  USING (class_id IN (SELECT id FROM classes WHERE institution_id = get_my_institution_id()) AND is_admin_or_above());

-- budgets: admin/management only
CREATE POLICY "budgets: admin management" ON budgets FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- expenses: submitter sees own, admin sees institution's
CREATE POLICY "expenses: own" ON expenses FOR SELECT USING (submitted_by = auth.uid());
CREATE POLICY "expenses: submit own" ON expenses FOR INSERT WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "expenses: admin manage" ON expenses FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- partners: partner sees own row, admin sees institution's
CREATE POLICY "partners: own row" ON partners FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "partners: admin manage" ON partners FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- partner_payouts: partner sees own, admin sees institution's
CREATE POLICY "partner_payouts: own" ON partner_payouts FOR SELECT
  USING (partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()));
CREATE POLICY "partner_payouts: admin manage" ON partner_payouts FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- wallet_transactions: user sees own wallet's transactions
CREATE POLICY "wallet_transactions: own" ON wallet_transactions FOR SELECT
  USING (wallet_id IN (SELECT id FROM digital_wallets WHERE user_id = auth.uid()));
CREATE POLICY "wallet_transactions: admin institution" ON wallet_transactions FOR ALL
  USING (wallet_id IN (SELECT id FROM digital_wallets WHERE institution_id = get_my_institution_id()) AND is_admin_or_above());

-- kpi_targets: institution-wide read (staff should see what they're targeted on)
CREATE POLICY "kpi_targets: institution read" ON kpi_targets FOR SELECT
  USING (institution_id = get_my_institution_id());
CREATE POLICY "kpi_targets: admin manage" ON kpi_targets FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- parent_student_links: parent sees own links, admin sees institution's
CREATE POLICY "parent_student_links: own" ON parent_student_links FOR SELECT
  USING (parent_user_id = auth.uid());
CREATE POLICY "parent_student_links: admin manage" ON parent_student_links FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- fee_payments: student sees own payments, admin/management sees institution's
CREATE POLICY "fee_payments: student own" ON fee_payments FOR SELECT
  USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "fee_payments: admin management" ON fee_payments FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- =============================================================================
-- Function hardening — fix search_path on all SECURITY DEFINER / trigger
-- functions the linter flagged (function_search_path_mutable). Without a
-- fixed search_path, a SECURITY DEFINER function is vulnerable to search_path
-- hijacking (a malicious role could create objects earlier in the resolved
-- path to redirect unqualified references) — locking it to `public` closes
-- that off.
-- =============================================================================

ALTER FUNCTION get_my_institution_id() SET search_path = public;
ALTER FUNCTION get_my_role() SET search_path = public;
ALTER FUNCTION is_admin_or_above() SET search_path = public;
ALTER FUNCTION trigger_set_updated_at() SET search_path = public;
ALTER FUNCTION update_partner_tier() SET search_path = public;
ALTER FUNCTION check_wallet_balance() SET search_path = public;
