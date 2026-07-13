-- =============================================================================
-- Migration 004: Leave requests + partner self-service (profile, payouts,
-- leaderboard)
--
-- Added while building out the Partner and Teacher portal pages:
--  - `leave_requests` didn't exist at all — the Teacher "Leave" page has
--    nothing to read/write without it.
--  - `partners` only had a SELECT-own + admin-ALL policy. A partner could
--    never update their own bank details (Profile page) or request a payout
--    (Payouts page) — both were missing INSERT/UPDATE policies entirely.
--  - A cross-partner leaderboard can't be built on top of "partners: own
--    row" (SELECT USING user_id = auth.uid()) without exposing every other
--    partner's bank details and exact earnings via a broader row policy.
--    Solved with a SECURITY DEFINER function that returns only the
--    non-sensitive columns, scoped to the caller's own institution — same
--    pattern already used by get_my_institution_id()/is_admin_or_above().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Leave requests
-- -----------------------------------------------------------------------------
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE leave_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  leave_type      TEXT NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  reason          TEXT,
  status          leave_status DEFAULT 'pending',
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_institution ON leave_requests(institution_id);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_requests: own" ON leave_requests FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "leave_requests: request own" ON leave_requests FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
-- Self-cancel only while still pending; can't self-approve or edit after review.
CREATE POLICY "leave_requests: cancel own pending" ON leave_requests FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'cancelled');
CREATE POLICY "leave_requests: admin manage" ON leave_requests FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- -----------------------------------------------------------------------------
-- Partner self-service: profile edit + payout requests
-- -----------------------------------------------------------------------------

-- Profile: a partner may update their own contact/payout-bank fields.
-- Financial/administrative fields (tier, total_recruited, total_earned,
-- referral_code, is_active, institution_id, user_id) must stay
-- admin/system-controlled — enforced with a trigger rather than relying on
-- the app layer alone, since RLS can't restrict individual columns.
CREATE POLICY "partners: update own" ON partners FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION lock_partner_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- The service role (edge functions using the service key) is exempt —
  -- this only guards direct self-service updates from the partner's own
  -- session, which is what "partners: update own" above allows.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.tier            := OLD.tier;
  NEW.total_recruited := OLD.total_recruited;
  NEW.total_earned    := OLD.total_earned;
  NEW.referral_code   := OLD.referral_code;
  NEW.is_active        := OLD.is_active;
  NEW.institution_id   := OLD.institution_id;
  NEW.user_id           := OLD.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER partners_lock_sensitive_fields
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION lock_partner_sensitive_fields();

-- Payouts: a partner may request a payout for themselves. Status must start
-- as 'requested' — only admin/management (via the "admin manage" ALL
-- policy) can move it to processing/completed/rejected.
CREATE POLICY "partner_payouts: request own" ON partner_payouts FOR INSERT
  WITH CHECK (
    status = 'requested'
    AND partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- Partner leaderboard (non-sensitive columns only, own-institution scoped)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_partner_leaderboard()
RETURNS TABLE (
  id UUID,
  company_name TEXT,
  full_name TEXT,
  tier partner_tier,
  total_recruited INT,
  is_self BOOLEAN
) AS $$
  SELECT
    p.id,
    p.company_name,
    u.full_name,
    p.tier,
    p.total_recruited,
    (p.user_id = auth.uid()) AS is_self
  FROM partners p
  JOIN users u ON u.id = p.user_id
  WHERE p.institution_id = get_my_institution_id()
    AND p.is_active = TRUE
  ORDER BY p.total_recruited DESC
  LIMIT 50
$$ LANGUAGE sql SECURITY DEFINER STABLE;
