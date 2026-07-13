-- Reconstructed from the live database (see 20260712172433_lock_down_security_definer_helpers.sql
-- for context on this batch of un-backfilled migrations).
--
-- Purpose: final pass narrowing the three functions that RLS policies
-- themselves call (get_my_institution_id, get_my_role, is_admin_or_above) so
-- that even the `anon` role -- which normally still has implicit access via
-- PUBLIC on some Postgres/Supabase setups -- cannot execute them directly.
-- These are only ever meant to be evaluated inside a policy for an
-- authenticated request.

REVOKE EXECUTE ON FUNCTION public.get_my_institution_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_above() FROM PUBLIC, anon;
