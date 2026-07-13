-- Batch 3 (APSpace-inspired): Classroom/Facility Finder, Exam Timetable,
-- Scholarship/Financial Aid tracker, Campus Shuttle schedule, and the
-- light/dark theme preference column.

-- ── Classroom / Facility Finder ─────────────────────────────────────────────
CREATE TABLE campus_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  room_number text NOT NULL,
  building text,
  capacity int,
  room_type text NOT NULL DEFAULT 'classroom' CHECK (room_type IN ('classroom', 'lab', 'auditorium', 'study_room')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campus_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campus_rooms: institution members view" ON campus_rooms
  FOR SELECT USING (institution_id = get_my_institution_id());
CREATE POLICY "campus_rooms: admin manage" ON campus_rooms
  FOR ALL USING (institution_id = get_my_institution_id() AND is_admin_or_above());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON campus_rooms
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Exam Timetable ───────────────────────────────────────────────────────────
CREATE TABLE exam_timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  programme_id uuid REFERENCES programmes(id) ON DELETE SET NULL,
  exam_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  venue text,
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exam_timetable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_timetable: institution members view" ON exam_timetable
  FOR SELECT USING (institution_id = get_my_institution_id());
CREATE POLICY "exam_timetable: admin manage" ON exam_timetable
  FOR ALL USING (institution_id = get_my_institution_id() AND is_admin_or_above());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON exam_timetable
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Scholarship / Financial Aid tracker ─────────────────────────────────────
CREATE TABLE financial_aid_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  aid_type text NOT NULL CHECK (aid_type IN ('scholarship', 'loan', 'grant', 'bursary')),
  provider text NOT NULL,
  amount numeric,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'approved', 'disbursed', 'rejected')),
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE financial_aid_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_aid_records: student sees own" ON financial_aid_records
  FOR SELECT USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "financial_aid_records: parent sees children's" ON financial_aid_records
  FOR SELECT USING (student_id IN (SELECT student_id FROM parent_student_links WHERE parent_user_id = auth.uid()));
CREATE POLICY "financial_aid_records: admin manage" ON financial_aid_records
  FOR ALL USING (institution_id = get_my_institution_id() AND is_admin_or_above());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON financial_aid_records
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Campus Shuttle schedule ──────────────────────────────────────────────────
CREATE TABLE shuttle_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  route_name text NOT NULL,
  stops text[] NOT NULL DEFAULT '{}',
  departure_times text[] NOT NULL DEFAULT '{}',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shuttle_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shuttle_routes: institution members view active" ON shuttle_routes
  FOR SELECT USING (institution_id = get_my_institution_id() AND is_active = true);
CREATE POLICY "shuttle_routes: admin manage" ON shuttle_routes
  FOR ALL USING (institution_id = get_my_institution_id() AND is_admin_or_above());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON shuttle_routes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Light/dark theme preference ─────────────────────────────────────────────
ALTER TABLE users ADD COLUMN theme text NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark'));
