-- FEATURE: "News & Events" -- inspired by the general concept of a university
-- portal news feed (not copying any third party's code/branding). Lets
-- admins classify an announcement so students can distinguish routine news
-- from calendar events worth marking down.
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'news';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS event_date timestamptz;

DO $$ BEGIN
  ALTER TABLE announcements ADD CONSTRAINT announcements_category_check
    CHECK (category IN ('news', 'event', 'academic', 'urgent'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
