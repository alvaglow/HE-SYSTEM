-- Staff Directory feature: lets any signed-in institution member (students,
-- parents, etc.) view basic teacher/staff contact info, without weakening any
-- existing narrower policy (RLS policies are OR'd together).
-- Backfilled from the live migration `add_staff_directory_rls` applied
-- directly via the Supabase MCP tool during this session.

CREATE POLICY "teachers: institution members view" ON teachers
  FOR SELECT USING (institution_id = get_my_institution_id());

CREATE POLICY "staff: institution members view" ON staff
  FOR SELECT USING (institution_id = get_my_institution_id());

CREATE POLICY "users: directory view of staff and teachers" ON users
  FOR SELECT USING (
    institution_id = get_my_institution_id()
    AND role IN ('teacher', 'staff', 'admin', 'management')
  );
