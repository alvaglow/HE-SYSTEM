// HE-SYSTEM Edge Function: attendance-checkin
// Ported from archive/HP SYSTEM/backend/routes/attendance.js — GPS geofence +
// biometric liveness check-in, offline queue flush, and Merkle proof lookup.
// This is the GPS/biometric sibling of attendance-otp (OTP check-in); both
// write to the same `attendance_records` table via `check_in_method`.
//
// POST body: { action: 'checkin' | 'flush_offline' | 'proof', ... }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireSelfOrStaff, authErrorResponse } from '../_shared/auth.ts'
import { requireSecrets, requireFields, isConfigError, isValidationError, configErrorResponse, validationErrorResponse } from '../_shared/resilience.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const LIVENESS_SECRET = Deno.env.get('LIVENESS_SECRET')

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function supa() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

// deno-lint-ignore no-explicit-any
async function logAudit(
  supabase: any,
  opts: { institutionId?: string | null; userId?: string | null; action: string; resourceType?: string; resourceId?: string; metadata?: Record<string, unknown> },
) {
  const { data: prev } = await supabase.from('audit_log').select('hash').order('created_at', { ascending: false }).limit(1).maybeSingle()
  const prevHash = (prev as { hash?: string } | null)?.hash ?? 'GENESIS'
  const ts = new Date().toISOString()
  const chainInput = `${prevHash}|${opts.userId ?? 'anon'}|${opts.action}|${ts}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(chainInput))
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
  await supabase.from('audit_log').insert({
    institution_id: opts.institutionId ?? null, user_id: opts.userId ?? null, action: opts.action,
    resource_type: opts.resourceType ?? null, resource_id: opts.resourceId ?? null,
    metadata: opts.metadata ?? {}, prev_hash: prevHash, hash, created_at: ts,
  })
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Liveness token format: `${userId}.${timestamp}.${hmacHex}`, signed by the
// mobile app's on-device liveness SDK using the shared LIVENESS_SECRET (never
// sent to the client). Must be < 30 seconds old.
async function verifyLivenessToken(token: string, timestamp: number, expectedUserId: string) {
  if (!token) return false
  if (Date.now() - timestamp > 30000) return false
  const [userId, ts, hmacHexReceived] = token.split('.')
  if (userId !== expectedUserId) return false
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(LIVENESS_SECRET!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${userId}:${ts}:liveness`))
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
  if (expected.length !== hmacHexReceived?.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ hmacHexReceived.charCodeAt(i)
  return diff === 0
}

// deno-lint-ignore no-explicit-any
async function doCheckin(supabase: any, p: {
  studentUserId: string
  classId: string
  latitude: number
  longitude: number
  livenessToken: string
  livenessTimestamp: number
  deviceId?: string
  offlineQueueId?: string
  offlineCapturedAt?: string
}) {
  const startMs = Date.now()

  const { data: student } = await supabase.from('students').select('id, institution_id').eq('user_id', p.studentUserId).single()
  if (!student) return { status: 404 as const, body: { error: 'Student not found' } }

  const { data: cls } = await supabase
    .from('classes')
    .select('id, institution_id, teacher_id, title, location_lat, location_lng, geofence_radius_m, checkin_method, starts_at, ends_at, is_cancelled')
    .eq('id', p.classId)
    .single()
  if (!cls) return { status: 404 as const, body: { error: 'Class not found' } }
  if (cls.is_cancelled) return { status: 400 as const, body: { error: 'Class cancelled', code: 'CANCELLED' } }
  if (cls.checkin_method === 'otp') return { status: 400 as const, body: { error: 'This class uses OTP check-in, not GPS/biometric', code: 'WRONG_METHOD' } }

  // AUDIT FIX: previously nothing confirmed the student was actually enrolled
  // in this class before marking them present.
  const { data: enrollment } = await supabase
    .from('class_enrollments').select('id').eq('class_id', p.classId).eq('student_id', student.id).eq('is_active', true).maybeSingle()
  if (!enrollment) return { status: 403 as const, body: { error: 'Student is not enrolled in this class', code: 'NOT_ENROLLED' } }

  const now = Date.now()
  const startsAt = new Date(cls.starts_at).getTime()
  const endsAt = new Date(cls.ends_at).getTime()
  if (!p.offlineQueueId && (now < startsAt - 15 * 60000 || now > endsAt)) {
    return { status: 400 as const, body: { error: 'Class session not open for check-in', code: 'SESSION_CLOSED' } }
  }

  // 1. Liveness verification — anti-spoofing, must pass before anything else
  const liveOk = await verifyLivenessToken(p.livenessToken, p.livenessTimestamp, p.studentUserId)
  if (!liveOk) {
    await logAudit(supabase, { institutionId: student.institution_id, userId: p.studentUserId, action: 'attendance.liveness.failed', metadata: { classId: p.classId } })
    return { status: 400 as const, body: { error: 'Liveness verification failed', code: 'LIVENESS_FAILED' } }
  }

  // 2. GPS geofence check
  let distanceMeters = 0
  let withinFence = true
  if (cls.location_lat != null && cls.location_lng != null) {
    distanceMeters = haversineMeters(p.latitude, p.longitude, cls.location_lat, cls.location_lng)
    withinFence = distanceMeters <= (cls.geofence_radius_m ?? 100)
  }
  if (!withinFence) {
    await logAudit(supabase, { institutionId: student.institution_id, userId: p.studentUserId, action: 'attendance.geofence.failed', metadata: { classId: p.classId, distanceMeters: Math.round(distanceMeters) } })
    return { status: 400 as const, body: { error: `Location outside class zone (${Math.round(distanceMeters)}m away, max ${cls.geofence_radius_m}m)`, code: 'OUTSIDE_GEOFENCE', distanceMeters: Math.round(distanceMeters) } }
  }

  // 3. Duplicate check
  const { data: dup } = await supabase.from('attendance_records').select('id').eq('class_id', p.classId).eq('student_id', student.id).maybeSingle()
  if (dup) return { status: 409 as const, body: { error: 'Already checked in', code: 'DUPLICATE' } }

  // 4. Record attendance
  const { data: record, error } = await supabase
    .from('attendance_records')
    .insert({
      institution_id: cls.institution_id,
      class_id: p.classId,
      student_id: student.id,
      status: 'present',
      marked_at: p.offlineCapturedAt ?? new Date().toISOString(),
      check_in_method: 'gps_biometric',
      latitude: p.latitude,
      longitude: p.longitude,
      distance_meters: Math.round(distanceMeters),
      liveness_verified: true,
      device_id: p.deviceId ?? null,
      offline_queue_id: p.offlineQueueId ?? null,
      offline_captured_at: p.offlineCapturedAt ?? null,
    })
    .select('id, marked_at')
    .single()
  if (error) return { status: 500 as const, body: { error: error.message } }

  // 5. Notify student + parents (fire and forget, budget: 5s)
  const notify = async () => {
    const { data: parents } = await supabase.from('parent_student_links').select('parent_user_id').eq('student_id', student.id)
    const recipients = [p.studentUserId, ...(parents ?? []).map((r: { parent_user_id: string }) => r.parent_user_id)]
    await Promise.allSettled(
      recipients.map((uid) =>
        supabase.functions.invoke('notify-send', {
          body: { user_id: uid, title: '✅ Attendance recorded', body: `Checked in to ${cls.title ?? 'class'} at ${new Date().toLocaleTimeString()}.`, channel: ['push', 'fcm', 'in_app', 'zalo_oa'], reference_type: 'attendance', reference_id: record.id },
        }),
      ),
    )
  }
  notify().catch(() => {})

  // 6. Audit log
  await logAudit(supabase, { institutionId: cls.institution_id, userId: p.studentUserId, action: 'attendance.checkin', resourceType: 'attendance', resourceId: record.id, metadata: { classId: p.classId, distanceMeters: Math.round(distanceMeters), livenessVerified: true, offline: !!p.offlineQueueId } })

  return { status: 200 as const, body: { success: true, recordId: record.id, checkInTime: record.marked_at, distanceMeters: Math.round(distanceMeters), elapsedMs: Date.now() - startMs } }
}

serve(async (req) => {
  const preflight = handleCors(req)
  if (preflight) return preflight
  const supabase = supa()
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  try {
    requireSecrets(['LIVENESS_SECRET'])
    const action = body.action as string

    if (action === 'checkin') {
      requireFields(body, ['student_user_id', 'class_id', 'latitude', 'longitude', 'liveness_token', 'liveness_timestamp'])
      const { student_user_id, class_id, latitude, longitude, liveness_token, liveness_timestamp, device_id } = body as {
        student_user_id: string; class_id: string; latitude: number; longitude: number; liveness_token: string; liveness_timestamp: number; device_id?: string
      }
      try {
        await requireSelfOrStaff(req, student_user_id)
      } catch (err) {
        return authErrorResponse(err)
      }
      const result = await doCheckin(supabase, { studentUserId: student_user_id, classId: class_id, latitude, longitude, livenessToken: liveness_token, livenessTimestamp: liveness_timestamp, deviceId: device_id })
      return json(result.body, result.status)
    }

    // Mobile app queues check-ins offline, flushes them here once back online
    if (action === 'flush_offline') {
      requireFields(body, ['student_user_id', 'queue'])
      const { student_user_id, queue } = body as {
        student_user_id: string
        queue: Array<{ classId: string; latitude: number; longitude: number; livenessToken: string; livenessTimestamp: number; deviceId?: string; offlineQueueId: string; capturedAt: number }>
      }
      if (!Array.isArray(queue)) return json({ error: 'queue must be an array' }, 400)
      try {
        await requireSelfOrStaff(req, student_user_id)
      } catch (err) {
        return authErrorResponse(err)
      }
      const results = []
      for (const item of queue.slice(0, 50)) {
        if (Date.now() - item.capturedAt > 86400000) {
          results.push({ queueId: item.offlineQueueId, status: 'expired' })
          continue
        }
        const result = await doCheckin(supabase, {
          studentUserId: student_user_id, classId: item.classId, latitude: item.latitude, longitude: item.longitude,
          livenessToken: item.livenessToken, livenessTimestamp: item.livenessTimestamp, deviceId: item.deviceId,
          offlineQueueId: item.offlineQueueId, offlineCapturedAt: new Date(item.capturedAt).toISOString(),
        })
        results.push({ queueId: item.offlineQueueId, status: result.status === 200 ? 'success' : (result.body as { code?: string }).code ?? 'error' })
      }
      return json({ results })
    }

    return json({ error: 'Invalid action' }, 400)
  } catch (err) {
    if (isConfigError(err)) return configErrorResponse(err)
    if (isValidationError(err)) return validationErrorResponse(err)
    console.error('attendance-checkin unhandled error:', err)
    return json({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) }, 500)
  }
})
