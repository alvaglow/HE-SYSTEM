-- Reconstructed from the live database (see 20260712172433_lock_down_security_definer_helpers.sql
-- for context on this batch of un-backfilled migrations).
--
-- Purpose: explicitly revoke the default PUBLIC execute grant Postgres
-- assigns to new functions, then re-grant only to the roles that actually
-- need to call these SECURITY DEFINER helpers at runtime.

REVOKE ALL ON FUNCTION public.get_my_institution_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_or_above() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_partner_leaderboard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lock_partner_sensitive_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_my_institution_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_above() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_leaderboard() TO authenticated;
