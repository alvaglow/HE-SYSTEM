-- Reconstructed from the live database (see 20260712172433_lock_down_security_definer_helpers.sql
-- for context on this batch of un-backfilled migrations).
--
-- Purpose: enable pg_cron/pg_net and schedule the three recurring edge
-- function triggers that back KPI calculation, the merkle audit-log build,
-- and invoice due-date reminders.
--
-- SECURITY NOTE: while reconstructing this file from the live `cron.job`
-- table, each scheduled job's command contained a literal `x-cron-secret`
-- header value in plaintext. That value has been redacted below and
-- replaced with a placeholder — it must NOT be committed to a shared repo.
-- Before applying this migration, replace REPLACE_WITH_CRON_SECRET with the
-- project's actual cron secret, ideally by reading it out of Supabase Vault
-- (`select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'`)
-- rather than hardcoding it in SQL. Because this same literal secret is
-- already sitting in the live `cron.job` table in plaintext (visible to
-- anyone able to query it) and was exposed once in this chat transcript, it
-- is worth rotating.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'kpi-calculate-monthly',
  '15 0 1 * *',
  $$
  select net.http_post(
    url := 'https://mluhfmflrdleyqrasuvk.supabase.co/functions/v1/kpi-calculate',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'merkle-build-daily',
  '55 23 * * *',
  $$
  select net.http_post(
    url := 'https://mluhfmflrdleyqrasuvk.supabase.co/functions/v1/merkle-build',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{"action": "build"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'invoice-due-reminder-daily',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://mluhfmflrdleyqrasuvk.supabase.co/functions/v1/invoice-due-reminder',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);
