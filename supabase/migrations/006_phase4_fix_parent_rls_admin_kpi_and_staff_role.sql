-- PHASE 4 AUDIT FIX: parent portal was returning empty children everywhere
-- because `students`/`users`/`class_enrollments`/`teachers` had no RLS SELECT
-- policy scoped to the parent role. attendance_records/exam_results/fee_invoices
-- already had correct "parent sees child" policies (used as the pattern here).

CREATE POLICY "students: parent sees own children" ON students
  FOR SELECT USING (
    id IN (SELECT student_id FROM parent_student_links WHERE parent_user_id = auth.uid())
  );

CREATE POLICY "class_enrollments: parent sees own children" ON class_enrollments
  FOR SELECT USING (
    student_id IN (SELECT student_id FROM parent_student_links WHERE parent_user_id = auth.uid())
  );

CREATE POLICY "teachers: parent sees children's teachers" ON teachers
  FOR SELECT USING (
    id IN (
      SELECT c.teacher_id FROM classes c
      JOIN class_enrollments ce ON ce.class_id = c.id
      WHERE ce.student_id IN (SELECT student_id FROM parent_student_links WHERE parent_user_id = auth.uid())
    )
  );

CREATE POLICY "users: parent sees linked users" ON users
  FOR SELECT USING (
    id IN (
      SELECT s.user_id FROM students s
      WHERE s.id IN (SELECT student_id FROM parent_student_links WHERE parent_user_id = auth.uid())
    )
    OR id IN (
      SELECT t.user_id FROM teachers t
      WHERE t.id IN (
        SELECT c.teacher_id FROM classes c
        JOIN class_enrollments ce ON ce.class_id = c.id
        WHERE ce.student_id IN (SELECT student_id FROM parent_student_links WHERE parent_user_id = auth.uid())
      )
    )
  );

-- PHASE 4 AUDIT FIX: admin (role='admin', not 'management') had no SELECT
-- policy on kpi_records/payroll_records at all -- only 'management' and 'own
-- row' existed, so an admin viewing institution-wide KPI/payroll saw only
-- their own single row.
CREATE POLICY "kpi: admin view" ON kpi_records
  FOR SELECT USING (institution_id = get_my_institution_id() AND is_admin_or_above());

CREATE POLICY "payroll: admin view" ON payroll_records
  FOR SELECT USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- PHASE 4 AUDIT FIX: admin-create-user's ALLOWED_ROLES and AddStaffForm both
-- already assumed a 'staff' role existed and insert into the `staff` table
-- for it, but user_role enum never had the value -- every "Support Staff"
-- creation failed the enum constraint and rolled back. is_admin_or_above()
-- only checks for 'admin'/'management' explicitly, so adding 'staff' grants
-- no elevated privilege by default (same minimal "own row" visibility as any
-- other role until explicitly granted more).
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff';
