-- Reconstructed from the live database (see 20260712172433_lock_down_security_definer_helpers.sql
-- for context on this batch of un-backfilled migrations).
--
-- Purpose: get_partner_leaderboard() is called directly from the Partner
-- portal leaderboard widget by authenticated users. The prior hardening pass
-- (lock_down_security_definer_helpers) left it with no explicit EXECUTE
-- grant for the `authenticated` role, which broke the widget. This restores
-- the grant.

GRANT EXECUTE ON FUNCTION public.get_partner_leaderboard() TO authenticated;
