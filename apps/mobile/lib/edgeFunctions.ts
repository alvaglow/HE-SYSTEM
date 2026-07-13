/**
 * HE-SYSTEM mobile — Supabase Edge Function client
 * apps/mobile/lib/edgeFunctions.ts
 *
 * Mirrors apps/web/lib/edgeFunctions.ts exactly (same function names, same
 * request shapes) so the mobile and web clients stay interchangeable against
 * the same backend — just swapped to use the mobile Supabase client (with
 * its SecureStore-backed session) instead of the web one.
 */
import { supabase } from './supabase'

function invoke<T = unknown>(name: string, body: Record<string, unknown>): Promise<T> {
  return supabase.functions.invoke(name, { body }).then(({ data, error }) => {
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

// ── Attendance (GPS + biometric liveness) — mobile-only, the flagship
// mobile feature. LIVENESS_SECRET never ships to the client (see
// supabase/functions/attendance-checkin/index.ts), so the signed token
// itself has to come from the server via attendance-liveness-token, called
// only after the OS-level biometric gate (Face ID / Touch ID / fingerprint)
// has already succeeded on-device. See app/(student)/checkin.tsx.
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

export const attendanceLiveness = {
  mintToken: () => invoke<{ token: string; timestamp: number }>('attendance-liveness-token', {}),
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
  // Stripe/ZaloPay/VNPay/MoMo all need a hosted checkout webview — mobile
  // opens the returned orderUrl via expo-web-browser (see PayNowButton.tsx).
}

// ── Invoicing, commission, KPI, notifications ───────────────────────────────────
export const invoiceGenerate = (params: { studentId: string; programmeId?: string; amount: number; dueDate: string; description?: string; institutionId: string }) =>
  invoke('invoice-generate', { student_id: params.studentId, programme_id: params.programmeId, amount: params.amount, due_date: params.dueDate, description: params.description, institution_id: params.institutionId })

export const commissionCalculate = (recruitId: string) => invoke('commission-calculate', { recruit_id: recruitId })

export const notifySend = (params: { userId: string; title: string; body: string; channel?: string[]; referenceType?: string; referenceId?: string }) =>
  invoke('notify-send', { user_id: params.userId, title: params.title, body: params.body, channel: params.channel ?? ['in_app'], reference_type: params.referenceType, reference_id: params.referenceId })

// ── Admin: account creation & KPI recalculation ─────────────────────────────
export const adminCreateUser = (params: {
  fullName: string; email: string; password: string
  role: 'student' | 'teacher' | 'staff' | 'admin' | 'management' | 'partner'
  programmeId?: string; position?: string
}) =>
  invoke<{ error?: string }>('admin-create-user', {
    full_name: params.fullName, email: params.email, password: params.password, role: params.role,
    programme_id: params.programmeId, position: params.position,
  })

// Also callable on-demand from the admin app (in addition to its normal CRON
// schedule — see supabase/config.toml) via the "Recalculate KPIs" button.
export const kpiCalculate = () => invoke<{ error?: string }>('kpi-calculate', {})

// ── Messaging ──────────────────────────────────────────────────────────────────
// Every messages screen calls this instead of inserting into `messages`
// directly — message-send verifies the real caller, performs the insert with
// its own service-role client, and notifies the recipient (push + in-app).
export const messageSend = (params: { recipientId: string; content: string }) =>
  invoke<{ message: { id: string; sender_id: string; recipient_id: string; content: string; created_at: string }; error?: string }>(
    'message-send', { recipient_id: params.recipientId, content: params.content },
  )
