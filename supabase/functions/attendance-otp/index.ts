// HE-SYSTEM Edge Function: attendance-otp
// POST body: { action: 'generate' | 'validate', class_id, otp? (for validate), student_id? }
//
// AUDIT FIXES applied:
//  - 'generate' now requires the caller to be the class's assigned teacher (or
//    staff) — previously anyone could mint an OTP for any class.
//  - 'validate' now requires the caller to be the student themselves (or
//    staff) — previously anyone could mark any student present by guessing/
//    knowing a class_id + student_id, without even needing the OTP to line up
//    with their own account.
//  - 'validate' now checks class_enrollments — previously a student could be
//    marked present in a class they were never enrolled in.
//  - the attendance_records upsert was missing institution_id, which is
//    NOT NULL in the schema — every OTP check-in was silently failing with a
//    constraint violation before this fix.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireCaller, requireSelfOrStaff, authErrorResponse } from '../_shared/auth.ts'
import { requireFields, isValidationError, validationErrorResponse } from '../_shared/resilience.ts'

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function supa() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

serve(async (req) => {
  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const { action, class_id, otp, student_id } = payload as { action: string; class_id: string; otp?: string; student_id?: string }
  const supabase = supa()

  try {
    requireFields(payload, ['action', 'class_id'])
  } catch (err) {
    if (isValidationError(err)) return validationErrorResponse(err)
    throw err
  }

  if (action === 'generate') {
    const { data: cls } = await supabase.from('classes').select('teacher_id, institution_id, checkin_method').eq('id', class_id).single()
    if (!cls) return json({ error: 'Class not found' }, 404)
    if (cls.checkin_method === 'gps_biometric') return json({ error: 'This class uses GPS/biometric check-in, not OTP', code: 'WRONG_METHOD' }, 400)

    try {
      const caller = await requireCaller(req)
      const isStaff = caller.role === 'admin' || caller.role === 'management'
      if (!isStaff) {
        const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', caller.userId).single()
        if (!teacher || teacher.id !== cls.teacher_id) {
          return json({ error: 'Only the assigned teacher (or an admin) can generate an OTP for this class' }, 403)
        }
      }
    } catch (err) {
      return authErrorResponse(err)
    }

    const code = generateOtp()
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min

    await supabase.from('classes')
      .update({ otp_code: code, otp_expires_at: expires })
      .eq('id', class_id)

    return json({ otp: code, expires_at: expires })
  }

  if (action === 'validate') {
    try {
      requireFields(payload, ['student_id', 'otp'])
    } catch (err) {
      if (isValidationError(err)) return validationErrorResponse(err)
      throw err
    }
    const { data: studentRow } = await supabase.from('students').select('user_id').eq('id', student_id).single()
    if (!studentRow) return json({ success: false, message: 'Student not found' }, 404)

    try {
      await requireSelfOrStaff(req, studentRow.user_id)
    } catch (err) {
      return authErrorResponse(err)
    }

    const { data: enrollment } = await supabase
      .from('class_enrollments').select('id').eq('class_id', class_id).eq('student_id', student_id).eq('is_active', true).maybeSingle()
    if (!enrollment) return json({ success: false, message: 'Student is not enrolled in this class', code: 'NOT_ENROLLED' }, 403)

    const { data: cls } = await supabase
      .from('classes')
      .select('otp_code, otp_expires_at, institution_id, checkin_method')
      .eq('id', class_id)
      .single()

    if (cls?.checkin_method === 'gps_biometric') return json({ success: false, message: 'This class uses GPS/biometric check-in, not OTP', code: 'WRONG_METHOD' }, 400)
    if (!cls?.otp_code) return json({ success: false, message: 'No OTP active' }, 400)
    if (new Date(cls.otp_expires_at) < new Date()) return json({ success: false, message: 'OTP expired' }, 400)
    if (cls.otp_code !== otp) return json({ success: false, message: 'Incorrect OTP' }, 400)

    await supabase.from('attendance_records').upsert({
      institution_id: cls.institution_id,
      class_id, student_id,
      status: 'present',
      marked_at: new Date().toISOString(),
      otp_used: true,
      check_in_method: 'otp',
    }, { onConflict: 'class_id,student_id' })

    return json({ success: true, message: 'Attendance marked' })
  }

  return json({ error: 'Invalid action' }, 400)
})
