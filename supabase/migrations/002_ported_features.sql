-- =============================================================================
-- HE-SYSTEM — Ported Features Schema
-- Migration: 002_ported_features.sql
-- Adds everything needed to fold "HP SYSTEM" (the parallel Express/Postgres/
-- Firebase build, now archived under /archive) into this Supabase/Next.js app:
--   - ZaloPay / VNPay / MoMo payment gateways, alongside the existing Stripe flow
--   - GPS geofence + biometric-liveness attendance check-in, alongside the
--     existing OTP check-in (both write to the same attendance_records table —
--     `classes` already models one scheduled session, so no separate
--     "attendance_sessions" table is needed)
--   - Daily Merkle-tree tamper-proof attendance verification
--   - Multi-device registration (FCM tokens + biometric public keys)
--   - Tamper-proof, hash-chained audit log
-- Run via: npx supabase db push
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE gateway_name AS ENUM ('stripe', 'zalopay', 'vnpay', 'momo');
CREATE TYPE gateway_txn_status AS ENUM ('pending', 'success', 'failed', 'expired');

-- =============================================================================
-- PAYMENTS — ZaloPay / VNPay / MoMo (Stripe keeps using fee_invoices/fee_payments
-- directly via payment-webhook; these tables cover the pending/idempotent
-- lifecycle every gateway needs before a payment is confirmed)
-- =============================================================================

CREATE TABLE payment_gateway_transactions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id        UUID NOT NULL REFERENCES institutions(id),
  invoice_id            UUID NOT NULL REFERENCES fee_invoices(id),
  user_id               UUID NOT NULL REFERENCES users(id),
  gateway               gateway_name NOT NULL,
  gateway_order_id      TEXT NOT NULL,
  gateway_txn_id        TEXT,
  idempotency_key       TEXT NOT NULL,
  amount                NUMERIC(14,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'VND',
  status                gateway_txn_status NOT NULL DEFAULT 'pending',
  anomaly_flag          BOOLEAN DEFAULT FALSE,
  anomaly_reason        TEXT,
  hmac_verified         BOOLEAN DEFAULT FALSE,
  retry_count           INT DEFAULT 0,
  next_retry_at         TIMESTAMPTZ,
  webhook_received_at   TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(idempotency_key),
  UNIQUE(gateway, gateway_order_id)
);

-- Raw immutable webhook/IPN storage — every inbound callback, verified or not
CREATE TABLE payment_webhooks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gateway       gateway_name NOT NULL,
  raw_body      TEXT NOT NULL,
  headers       JSONB,
  hmac_valid    BOOLEAN NOT NULL DEFAULT FALSE,
  received_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Rolling spend history per user, used for 2-sigma anomaly detection at checkout
CREATE TABLE payment_spend_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id),
  amount        NUMERIC(14,2) NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'VND',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Link the confirmed-payment ledger back to the gateway transaction it came from
ALTER TABLE fee_payments
  ADD COLUMN gateway                gateway_name,
  ADD COLUMN gateway_transaction_id UUID REFERENCES payment_gateway_transactions(id);

-- =============================================================================
-- DEVICES — multi-device FCM push + biometric public keys
-- (users.fcm_token / users.expo_push_token stay as the "primary device"
-- convenience columns already used by notify-send; this table adds full
-- multi-device fan-out and biometric-liveness key storage)
-- =============================================================================

CREATE TABLE user_devices (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name             TEXT,
  platform                TEXT,
  fcm_token               TEXT,
  expo_push_token         TEXT,
  biometric_public_key    TEXT,
  is_active               BOOLEAN DEFAULT TRUE,
  last_seen_at            TIMESTAMPTZ DEFAULT NOW(),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Zalo Official Account id, for Zalo OA notification channel
ALTER TABLE users ADD COLUMN zalo_oa_id TEXT;

-- =============================================================================
-- ATTENDANCE — GPS geofence + biometric liveness check-in
-- `classes` already represents one scheduled session (see 001 comment "Classes
-- (individual sessions)") and already carries location_lat/location_lng, so the
-- geofence center is per-class, not a separate sessions table.
-- =============================================================================

ALTER TABLE classes
  ADD COLUMN geofence_radius_m INT DEFAULT 100,
  ADD COLUMN checkin_method    TEXT DEFAULT 'otp'; -- 'otp' | 'gps_biometric' | 'both'

ALTER TABLE attendance_records
  ADD COLUMN check_in_method     TEXT DEFAULT 'otp', -- 'otp' | 'gps_biometric' | 'manual'
  ADD COLUMN latitude            NUMERIC(10,7),
  ADD COLUMN longitude           NUMERIC(10,7),
  ADD COLUMN distance_meters     INT,
  ADD COLUMN liveness_verified   BOOLEAN DEFAULT FALSE,
  ADD COLUMN device_id           UUID REFERENCES user_devices(id),
  ADD COLUMN offline_queue_id    UUID,
  ADD COLUMN offline_captured_at TIMESTAMPTZ;

-- Daily Merkle root per institution — tamper-proof, independently verifiable
CREATE TABLE daily_merkle_roots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  date            DATE NOT NULL,
  root_hash       TEXT NOT NULL,
  record_count    INT NOT NULL,
  leaf_hashes     JSONB NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, date)
);

-- =============================================================================
-- AUDIT LOG — tamper-proof, SHA-256 hash-chained
-- (Computed server-side in edge functions from the previous row's hash, rather
-- than an in-memory chain anchor — edge functions are stateless, so the chain
-- must live in the table itself to stay valid across invocations.)
-- =============================================================================

CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID REFERENCES institutions(id),
  user_id         UUID REFERENCES users(id),
  action          TEXT NOT NULL,
  resource_type   TEXT,
  resource_id     UUID,
  metadata        JSONB DEFAULT '{}',
  ip_address      TEXT,
  user_agent      TEXT,
  prev_hash       TEXT NOT NULL,
  hash            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_pgt_invoice ON payment_gateway_transactions(invoice_id);
CREATE INDEX idx_pgt_user ON payment_gateway_transactions(user_id);
CREATE INDEX idx_pgt_status_retry ON payment_gateway_transactions(status, next_retry_at);
CREATE INDEX idx_payment_spend_user ON payment_spend_history(user_id, created_at);
CREATE INDEX idx_user_devices_user ON user_devices(user_id, is_active);
CREATE INDEX idx_attendance_session_method ON attendance_records(check_in_method);
CREATE INDEX idx_merkle_roots_institution_date ON daily_merkle_roots(institution_id, date);
CREATE INDEX idx_audit_log_institution_created ON audit_log(institution_id, created_at);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);

-- =============================================================================
-- TRIGGERS — updated_at (extend the existing 001 trigger to new tables)
-- =============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'payment_gateway_transactions', 'daily_merkle_roots'
  ] LOOP
    EXECUTE format('
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at();
    ', tbl);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'payment_gateway_transactions', 'payment_webhooks', 'payment_spend_history',
    'user_devices', 'daily_merkle_roots', 'audit_log'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- payment_gateway_transactions: user sees own, admin sees institution's
CREATE POLICY "pgt: own" ON payment_gateway_transactions FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "pgt: admin institution" ON payment_gateway_transactions FOR ALL
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());

-- payment_webhooks / payment_spend_history: service-role + admin only (no direct
-- user access — these are internal ledger/anomaly tables written by edge functions
-- using the service role key, which bypasses RLS)
CREATE POLICY "webhooks: admin read" ON payment_webhooks FOR SELECT
  USING (get_my_role() IN ('admin', 'management'));
CREATE POLICY "spend history: admin read" ON payment_spend_history FOR SELECT
  USING (get_my_role() IN ('admin', 'management'));

-- user_devices: own devices only
CREATE POLICY "devices: own" ON user_devices FOR ALL
  USING (user_id = auth.uid());
CREATE POLICY "devices: admin institution view" ON user_devices FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE institution_id = get_my_institution_id())
    AND is_admin_or_above());

-- daily_merkle_roots: institution-wide read (anyone can independently verify)
CREATE POLICY "merkle: institution read" ON daily_merkle_roots FOR SELECT
  USING (institution_id = get_my_institution_id());

-- audit_log: admin/management read-only, scoped to institution; never writable
-- via the client — only edge functions using the service role key write here
CREATE POLICY "audit: admin institution read" ON audit_log FOR SELECT
  USING (institution_id = get_my_institution_id() AND is_admin_or_above());
