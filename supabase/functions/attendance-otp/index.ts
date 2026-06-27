// HE-SYSTEM Edge Function: attendance-otp
// POST body: { action: 'generate' | 'validate', class_id, otp? (for validate), student_id? }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

serve(async (req) => {
  const { action, class_id, otp, student_id } = await req.json()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  if (action === 'generate') {
    const code = generateOtp()
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min

    await supabase.from('classes')
      .update({ otp_code: code, otp_expires_at: expires })
      .eq('id', class_id)

    return new Response(JSON.stringify({ otp: code, expires_at: expires }), {
      headers: { 'Content-Type': 'application/json' }, status: 200
    })
  }

  if (action === 'validate') {
    const { data: cls } = await supabase
      .from('classes')
      .select('otp_code, otp_expires_at')
      .eq('id', class_id)
      .single()

    if (!cls?.otp_code) return new Response(JSON.stringify({ success: false, message: 'No OTP active' }), { status: 400 })
    if (new Date(cls.otp_expires_at) < new Date()) return new Response(JSON.stringify({ success: false, message: 'OTP expired' }), { status: 400 })
    if (cls.otp_code !== otp) return new Response(JSON.stringify({ success: false, message: 'Incorrect OTP' }), { status: 400 })

    await supabase.from('attendance_records').upsert({
      class_id, student_id,
      status: 'present',
      marked_at: new Date().toISOString(),
      otp_used: true,
    }, { onConflict: 'class_id,student_id' })

    return new Response(JSON.stringify({ success: true, message: 'Attendance marked' }), {
      headers: { 'Content-Type': 'application/json' }, status: 200
    })
  }

  return new Response('Invalid action', { status: 400 })
})
