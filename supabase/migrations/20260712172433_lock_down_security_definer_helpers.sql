-- Reconstructed from the live database (original SQL text was applied via an
-- ad hoc tool call during an earlier session and was never saved to a local
-- file). This file is named after the real Supabase migration version
-- (20260712172433) so `supabase migration list` timestamps line up, but it
-- is written defensively (plain ALTER FUNCTION statements against functions
-- already created in 001_initial_schema.sql) so it is safe to apply
-- regardless of exact ordering relative to 004-009.
--
-- Purpose: mark internal RLS/business-logic helper functions as SECURITY
-- DEFINER with a locked-down search_path, so they run with the privileges of
-- their owner (not the calling role) and can't be tricked by a malicious
-- session search_path into resolving to an attacker-controlled object.

ALTER FUNCTION public.get_my_institution_id() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.get_my_role() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.is_admin_or_above() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.get_partner_leaderboard() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.lock_partner_sensitive_fields() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.rls_auto_enable() SECURITY DEFINER SET search_path = pg_catalog;
