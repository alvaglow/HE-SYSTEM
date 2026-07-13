-- =============================================================================
-- HE-SYSTEM — Security Advisor Remediation
-- Migration: 005_security_advisor_fixes.sql
-- Supabase PostgreSQL — Run via: npx supabase db push
--
-- Fixes flagged by the live Supabase security advisor after migration 004:
--   1. function_search_path_mutable — lock_partner_sensitive_fields() and
--      get_partner_leaderboard() didn't pin `search_path`, which means a
--      malicious role with CREATE privilege on some schema earlier in the
--      caller's search_path could shadow an unqualified identifier used
--      inside the function body. Fixed by pinning `search_path = public`
--      on both.
--   2. anon_security_definer_function_executable — lock_partner_sensitive_fields
--      is a trigger-only function; it has no reason to ever be invoked
--      directly via PostgREST (`/rest/v1/rpc/...`) by any role, so EXECUTE
--      is revoked from PUBLIC entirely (the trigger itself still fires
--      regardless of function-level EXECUTE grants). get_partner_leaderboard
--      is meant to be called by signed-in partners only (see
--      apps/web/app/partner/leaderboard/page.tsx), so EXECUTE is revoked
--      from `anon` but kept for `authenticated`.
--
-- NOT addressed here (pre-existing, lower risk, out of this migration's
-- scope — flagging for a future pass rather than touching blind):
--   - get_my_institution_id() / get_my_role() / is_admin_or_above() /
--     rls_auto_enable() are also flagged as anon/authenticated-executable
--     SECURITY DEFINER functions. They only ever return data derived from
--     auth.uid() (NULL for anon, so anon callers get no useful data back),
--     and dozens of existing RLS policies across migrations 001-003 rely on
--     being able to call them — revoking broadly here risks silently
--     breaking policy evaluation for authenticated users without a full
--     regression pass. Recommend addressing in a dedicated follow-up.
--   - auth_leaked_password_protection — this is a Supabase Auth dashboard
--     toggle (Authentication -> Policies -> Password Security), not
--     something a SQL migration can change.
-- =============================================================================

CREATE OR REPLACE FUNCTION lock_partner_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.tier            := OLD.tier;
  NEW.total_recruited := OLD.total_recruited;
  NEW.total_earned    := OLD.total_earned;
  NEW.referral_code    := OLD.referral_code;
  NEW.is_active        := OLD.is_active;
  NEW.institution_id   := OLD.institution_id;
  NEW.user_id           := OLD.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION lock_partner_sensitive_fields() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION lock_partner_sensitive_fields() FROM anon;
REVOKE EXECUTE ON FUNCTION lock_partner_sensitive_fields() FROM authenticated;

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
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_partner_leaderboard() FROM anon;
GRANT EXECUTE ON FUNCTION get_partner_leaderboard() TO authenticated;
