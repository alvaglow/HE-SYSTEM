-- Student profile fields, Digital Library resources, and dashboard personalization.
-- Backfilled from the live migration `add_profile_library_and_personalization`
-- applied directly via the Supabase MCP tool during this session.

ALTER TABLE students ADD COLUMN IF NOT EXISTS student_pass_expiry date;

CREATE TABLE IF NOT EXISTS library_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  url text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  resource_type text NOT NULL DEFAULT 'link',
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE library_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "library_resources: institution read published" ON library_resources
  FOR SELECT USING (institution_id = get_my_institution_id() AND is_published = true);

CREATE POLICY "library_resources: admin manage" ON library_resources
  FOR ALL USING (institution_id = get_my_institution_id() AND is_admin_or_above());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON library_resources
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE users ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT 'blue';
ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_tile_order text[];

ALTER TABLE users ADD CONSTRAINT users_accent_color_check
  CHECK (accent_color IN ('blue','red','green','purple','amber','gray'));
