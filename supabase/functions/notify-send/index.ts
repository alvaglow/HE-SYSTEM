// HE-SYSTEM Edge Function: notify-send
// Routes notifications to: Expo Push, SMS (Twilio), Email (Resend), in-app DB

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { user_id, title, body, channel = ['in_app'], reference_type, reference_id } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: user } = await supabase
    .from('users').select('expo_push_token, phone, email, institution_id').eq('id', user_id).single()

  if (!user) return new Response('User not found', { status: 404 })

  const channels: string[] = Array.isArray(channel) ? channel : [channel]

  // ── Push notification via Expo ───────────────────────────────────────────
  if (channels.includes('push') && user.expo_push_token) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: user.expo_push_token, title, body, sound: 'default' }),
    })
  }

  // ── SMS via Twilio ───────────────────────────────────────────────────────
  if (channels.includes('sms') && user.phone) {
    const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const token = Deno.env.get('TWILIO_AUTH_TOKEN')
    const from = Deno.env.get('TWILIO_FROM_NUMBER')
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${sid}:${token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: user.phone, From: from!, Body: `${title}: ${body}` }),
    })
  }

  // ── Email via Resend ─────────────────────────────────────────────────────
  if (channels.includes('email') && user.email) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM_EMAIL'),
        to: user.email,
        subject: title,
        html: `<p>${body}</p>`,
      }),
    })
  }

  // ── Always insert in-app notification ───────────────────────────────────
  await supabase.from('notifications').insert({
    institution_id: user.institution_id,
    user_id,
    title,
    body,
    channel: 'in_app',
    reference_type,
    reference_id,
    sent_at: new Date().toISOString(),
  })

  return new Response(JSON.stringify({ sent: true }), {
    headers: { 'Content-Type': 'application/json' }, status: 200
  })
})
