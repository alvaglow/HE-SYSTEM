// HE-SYSTEM shared Edge Function helper: trusted cron-dispatch secret.
//
// WHY THIS EXISTS: kpi-calculate and merkle-build were declared with cron
// schedules in supabase/config.toml, but those schedules only take effect if
// the project is linked/deployed via the Supabase CLI, which this project
// never was (functions were deployed via MCP instead) — so pg_cron/pg_net
// were never actually installed, and the schedules never ran. Fixing that
// means Postgres itself (via pg_cron + net.http_post) must call these
// functions on a timer. But both functions guard themselves with
// `isServiceRoleCall(req) OR requireStaff(req)` — and the value Postgres can
// safely hold for an outbound HTTP call (via Vault) is NOT the same secret
// these functions already trust, so a cron-originated call would otherwise
// be rejected by the functions' own auth guard.
//
// Rather than weakening that guard to accept any authenticated session, or
// exporting the real service-role key into a new place, this file defines a
// single fixed, randomly-generated shared secret used ONLY for this purpose:
// Postgres sends it as the `x-cron-secret` header on its scheduled
// net.http_post calls (the same value is stored in Supabase Vault via
// migration 0008_cron_infra.sql), and each cron-triggered function compares
// the incoming header against this constant. It grants no privileges beyond
// "permission to run this specific scheduled batch job" — it cannot be used
// to call any other function or bypass RLS on its own.
export const CRON_SECRET = '92cc91575fadc2feced31b4f437a47688a7cf65537368923'

export function isCronCall(req: Request): boolean {
  return req.headers.get('x-cron-secret') === CRON_SECRET
}
