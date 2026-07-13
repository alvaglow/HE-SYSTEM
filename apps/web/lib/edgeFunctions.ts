/**
 * HE-SYSTEM — Supabase Edge Function client
 * apps/web/lib/edgeFunctions.ts
 *
 * Replaces the old apps/web/src/lib/api.js, which was dead code left over
 * from the archived "HP SYSTEM" build (a separate Express server at
 * localhost:4000 that no longer exists in this app — it wasn't imported
 * anywhere, and reading tokens from localStorage conflicted with how auth
 * actually works here, via @supabase/ssr cookies in lib/supabase/client.ts
 * and server.ts).
 *
 * This file is a thin, typed wrapper around `supabase.functions.invoke(...)`
 * for every edge function in supabase/functions/, so call sites don't have to
 * remember function names or request shapes by hand.
 */

import { createClient } from './supabase/client'

function invoke<T = unknown>(name: string, body: Record<string, unknown>): Promise<T> {
  return createClient()
    .functions.invoke(name, { body })
    .then(({ data, error }) => {
      if (error) throw error
      return data as T
    })
}

// ── Attendance (OTP) ───────────────────────────────────────────────────────────
export const attendanceOtp = {
  generate: (classId: string) => invoke('attendance-otp', { action: 'generate', class_id: classId }),
  validate: (classId: string, studentId: string, otp: string) =>
    invoke('attendance-otp', { action: 'validate', class_id: classId, student_id: studentId, otp }),
}

// ── Attendance (GPS + biometric liveness) ───────────────────────────────────────
export const attendanceCheckin = {
  checkin: (params: {
    studentUserId: string; classId: string; latitude: number; longitude: number
    livenessToken: string; livenessTimestamp: number; deviceId?: string
  }) =>
    invoke('attendance-checkin', {
      action: 'checkin', student_user_id: params.studentUserId, class_id: params.classId,
      latitude: params.latitude, longitude: params.longitude,
      liveness_token: params.livenessToken, liveness_timestamp: params.livenessTimestamp, device_id: params.deviceId,
    }),
  flushOffline: (studentUserId: string, queue: unknown[]) =>
    invoke('attendance-checkin', { action: 'flush_offline', student_user_id: studentUserId, queue }),
}

// ── Merkle-tree tamper-proof verification ───────────────────────────────────────
export const merkle = {
  build: (institutionId?: string, date?: string) => invoke('merkle-build', { action: 'build', institution_id: institutionId, date }),
  proof: (attendanceId: string) => invoke('merkle-build', { action: 'proof', attendance_id: attendanceId }),
  verify: (leaf: string, proof: { position: 'left' | 'right'; data: string }[], root: string) =>
    invoke<{ valid: boolean }>('merkle-build', { action: 'verify', leaf, proof, root }),
}

// ── Payments ─────────────────────────────────────────────────────────────────
export const payments = {
  zalopay: {
    create: (params: { invoiceId: string; userId: string; institutionId: string; amountVnd: number; description: string; idempotencyKey: string }) =>
      invoke('payment-zalopay', { action: 'create', invoice_id: params.invoiceId, user_id: params.userId, institution_id: params.institutionId, amount_vnd: params.amountVnd, description: params.description, idempotency_key: params.idempotencyKey }),
    query: (appTransId: string) => invoke('payment-zalopay', { action: 'query', app_trans_id: appTransId }),
  },
  vnpay: {
    create: (params: { invoiceId: string; userId: string; institutionId: string; amountVnd: number; description: string; idempotencyKey: string; ipAddr?: string }) =>
      invoke('payment-vnpay', { action: 'create', invoice_id: params.invoiceId, user_id: params.userId, institution_id: params.institutionId, amount_vnd: params.amountVnd, description: params.description, idempotency_key: params.idempotencyKey, ip_addr: params.ipAddr }),
    query: (txnRef: string, transDate: string) => invoke('payment-vnpay', { action: 'query', txn_ref: txnRef, trans_date: transDate }),
  },
  momo: {
    create: (params: { invoiceId: string; userId: string; institutionId: string; amountVnd: number; description: string; idempotencyKey: string }) =>
      invoke('payment-momo', { action: 'create', invoice_id: params.invoiceId, user_id: params.userId, institution_id: params.institutionId, amount_vnd: params.amountVnd, description: params.description, idempotency_key: params.idempotencyKey }),
    query: (orderId: string) => invoke('payment-momo', { action: 'query', order_id: orderId }),
  },
  // Stripe doesn't need an app-initiated call here — @stripe/stripe-js drives
  // the client-side checkout directly, and payment-webhook (Stripe's own
  // webhook callback) handles confirmation server-side.
}

// ── Invoicing, commission, KPI, notifications ───────────────────────────────────
export const invoiceGenerate = (params: { studentId: string; programmeId: string; amount: number; dueDate: string; description?: string; institutionId: string }) =>
  invoke('invoice-generate', { student_id: params.studentId, programme_id: params.programmeId, amount: params.amount, due_date: params.dueDate, description: params.description, institution_id: params.institutionId })

export const commissionCalculate = (recruitId: string) => invoke('commission-calculate', { recruit_id: recruitId })

export const notifySend = (params: { userId: string; title: string; body: string; channel?: string[]; referenceType?: string; referenceId?: string }) =>
  invoke('notify-send', { user_id: params.userId, title: params.title, body: params.body, channel: params.channel ?? ['in_app'], reference_type: params.referenceType, reference_id: params.referenceId })

// kpi-calculate is CRON-only (see supabase/config.toml) — no client call needed.

// ── Messaging ──────────────────────────────────────────────────────────────────
// Every ComposeForm calls this instead of inserting into `messages` directly —
// message-send verifies the real caller, performs the insert with its own
// service-role client, and notifies the recipient (push + in-app) server-side.
export const messageSend = (params: { recipientId: string; content: string }) =>
  invoke<{ message: { id: string; sender_id: string; recipient_id: string; content: string; created_at: string }; error?: string }>(
    'message-send', { recipient_id: params.recipientId, content: params.content },
  )
