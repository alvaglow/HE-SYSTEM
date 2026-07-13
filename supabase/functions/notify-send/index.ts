// HE-SYSTEM Edge Function: notify-send
// Routes notifications to: Expo Push, FCM (multi-device), SMS (Twilio),
// Email (Resend), Zalo OA, and in-app DB.
//
// FCM and Zalo OA channels are ported from
// archive/HP SYSTEM/backend/services/notifications.js. The original used the
// firebase-admin Node SDK, which doesn't run on Deno; FCM v1 is called here
// directly over HTTP with a hand-signed Google OAuth service-account JWT.
//
// PILOT-LAUNCH HARDENING: this is a multi-channel fan-out — a missing
// RESEND_API_KEY or Twilio credential previously meant the fetch call still
// fired with "undefined" baked into the request (a wasted network call that
// always 401s) with no visibility into why. Every channel now checks its
// own secrets before attempting delivery, records a per-channel outcome
// (`sent` / `skipped: not configured` / `error: ...`) in the response, and
// keeps failures scoped to that channel — one channel being unconfigured or
// down must never prevent the others (or the in-app notification, which has
// no external dependency) from going out. The Resend email send is wrapped
// in a 2-attempt retry since a transient network blip shouldn't drop a
// payment receipt or invoice email.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isServiceRoleCall, requireStaff, authErrorResponse } from '../_shared/auth.ts'
import { requireFields, fetchWithTimeout, retry, isValidationError, validationErrorResponse } from '../_shared/resilience.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const FCM_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID')
const FCM_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL')
const FCM_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n')
const ZALO_OA_ACCESS_TOKEN = Deno.env.get('ZALO_OA_ACCESS_TOKEN')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL')
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER')

function b64url(input: ArrayBuffer | string) {
  const b64 = typeof input === 'string' ? btoa(input) : btoa(String.fromCharCode(...new Uint8Array(input)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '')
  const raw = atob(b64)
  const buf = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf.buffer
}

// Cached per-isolate — edge function instances are frequently reused, so this
// avoids re-requesting an OAuth token on every single invocation.
let cachedFcmToken: { token: string; expiresAt: number } | null = null

async function getFcmAccessToken(): Promise<string | null> {
  if (!FCM_CLIENT_EMAIL || !FCM_PRIVATE_KEY) return null
  if (cachedFcmToken && cachedFcmToken.expiresAt > Date.now() + 30000) return cachedFcmToken.token

  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(JSON.stringify({
    iss: FCM_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const unsigned = `${header}.${claim}`
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(FCM_PRIVATE_KEY), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  const jwt = `${unsigned}.${b64url(sig)}`

  const res = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  }, 8000)
  if (!res.ok) return null
  const data = await res.json()
  cachedFcmToken = { token: data.access_token, expiresAt: now * 1000 + data.expires_in * 1000 }
  return data.access_token
}

async function sendFcm(fcmToken: string, title: string, body: string, data: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  if (!FCM_PROJECT_ID) return { ok: false, error: 'not configured' }
  const accessToken = await getFcmAccessToken()
  if (!accessToken) return { ok: false, error: 'FCM auth failed' }
  try {
    const res = await fetchWithTimeout(`https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: { title, body },
          data,
          android: { priority: 'high' },
          apns: { payload: { aps: { alert: { title, body }, sound: 'default' } } },
        },
      }),
    }, 8000)
    if (!res.ok) return { ok: false, error: `FCM responded ${res.status}` }
    return { ok: true }
  } catch (err) {
    console.error('sendFcm failed:', err)
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function sendZaloOA(zaloOaId: string, templateId: string, templateData: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  if (!ZALO_OA_ACCESS_TOKEN) return { ok: false, error: 'not configured' }
  try {
    const res = await fetchWithTimeout('https://openapi.zalo.me/v2.0/oa/message/template', {
      method: 'POST',
      headers: { access_token: ZALO_OA_ACCESS_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { user_id: zaloOaId }, message: { attachment: { type: 'template', payload: { template_id: templateId, template_data: templateData } } } }),
    }, 8000)
    if (!res.ok) return { ok: false, error: `Zalo OA responded ${res.status}` }
    return { ok: true }
  } catch (err) {
    console.error('sendZaloOA failed:', err)
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

serve(async (req) => {
  const preflight = handleCors(req)
  if (preflight) return preflight
  // AUDIT FIX: this is a system-level dispatcher (always called by other edge
  // functions today, using the service-role key). It previously had no check
  // at all, so any authenticated user could spam push/SMS/email notifications
  // to any other user by supplying their user_id directly. Only trusted
  // service-role callers or staff may invoke it.
  if (!isServiceRoleCall(req)) {
    try {
      await requireStaff(req)
    } catch (err) {
      return authErrorResponse(err)
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    requireFields(payload, ['user_id', 'title', 'body'])
  } catch (err) {
    if (isValidationError(err)) return validationErrorResponse(err)
    throw err
  }

  const {
    user_id, title, body,
    channel = ['in_app'],
    reference_type, reference_id,
    zalo_template_id, zalo_template_data,
    html_body, // optional richer HTML for the email channel (invoices/receipts)
  } = payload as {
    user_id: string; title: string; body: string; channel?: string | string[]
    reference_type?: string; reference_id?: string
    zalo_template_id?: string; zalo_template_data?: Record<string, unknown>; html_body?: string
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: user, error: userErr } = await supabase
    .from('users').select('expo_push_token, fcm_token, phone, email, institution_id, zalo_oa_id').eq('id', user_id).single()

  if (userErr || !user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const channels: string[] = Array.isArray(channel) ? channel : [channel]
  // deno-lint-ignore no-explicit-any
  const results: Record<string, any> = {}

  // ── Push notification via Expo (primary device column) ──────────────────────
  if (channels.includes('push')) {
    if (!user.expo_push_token) {
      results.push = { sent: false, reason: 'no device token on file' }
    } else {
      try {
        const res = await fetchWithTimeout('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: user.expo_push_token, title, body, sound: 'default' }),
        }, 8000)
        results.push = { sent: res.ok }
      } catch (err) {
        console.error('Expo push failed (non-fatal):', err)
        results.push = { sent: false, reason: err instanceof Error ? err.message : String(err) }
      }
    }
  }

  // ── FCM push, fanned out to every active registered device ──────────────────
  if (channels.includes('fcm')) {
    if (!FCM_PROJECT_ID || !FCM_CLIENT_EMAIL || !FCM_PRIVATE_KEY) {
      console.error('notify-send: fcm channel requested but FIREBASE_* secrets are not configured')
      results.fcm = { sent: false, reason: 'not configured' }
    } else {
      const tokens = new Set<string>()
      if (user.fcm_token) tokens.add(user.fcm_token)
      const { data: devices } = await supabase.from('user_devices').select('fcm_token').eq('user_id', user_id).eq('is_active', true).not('fcm_token', 'is', null)
      for (const d of devices ?? []) if (d.fcm_token) tokens.add(d.fcm_token)

      const outcomes = await Promise.allSettled(
        Array.from(tokens).map((token) => sendFcm(token, title, body, { reference_type: reference_type ?? '', reference_id: reference_id ?? '', timestamp: new Date().toISOString() })),
      )
      results.fcm = { attempted: tokens.size, sent: outcomes.filter((o) => o.status === 'fulfilled' && o.value.ok).length }
    }
  }

  // ── SMS via Twilio ───────────────────────────────────────────────────────────
  if (channels.includes('sms')) {
    if (!user.phone) {
      results.sms = { sent: false, reason: 'no phone number on file' }
    } else if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
      console.error('notify-send: sms channel requested but TWILIO_* secrets are not configured')
      results.sms = { sent: false, reason: 'not configured' }
    } else {
      try {
        const res = await fetchWithTimeout(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: user.phone, From: TWILIO_FROM_NUMBER, Body: `${title}: ${body}` }),
        }, 8000)
        results.sms = { sent: res.ok }
      } catch (err) {
        console.error('Twilio SMS failed (non-fatal):', err)
        results.sms = { sent: false, reason: err instanceof Error ? err.message : String(err) }
      }
    }
  }

  // ── Email via Resend ──────────────────────────────────────────────────────────
  if (channels.includes('email')) {
    if (!user.email) {
      results.email = { sent: false, reason: 'no email on file' }
    } else if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      console.error('notify-send: email channel requested but RESEND_API_KEY/RESEND_FROM_EMAIL are not configured')
      results.email = { sent: false, reason: 'not configured' }
    } else {
      try {
        // Email often carries a payment receipt or invoice — worth a retry
        // on a transient network blip rather than silently dropping it.
        const res = await retry(() => fetchWithTimeout('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: user.email,
            subject: title,
            html: html_body ?? `<p>${body}</p>`,
          }),
        }, 8000), 2)
        results.email = { sent: res.ok }
        if (!res.ok) console.error('Resend responded with non-OK status:', res.status, await res.text().catch(() => ''))
      } catch (err) {
        console.error('Resend email failed after retry (non-fatal):', err)
        results.email = { sent: false, reason: err instanceof Error ? err.message : String(err) }
      }
    }
  }

  // ── Zalo OA — requires a pre-approved template; skipped silently if none given ─
  if (channels.includes('zalo_oa')) {
    if (!user.zalo_oa_id || !zalo_template_id) {
      results.zalo_oa = { sent: false, reason: 'missing zalo_oa_id or template_id' }
    } else {
      const outcome = await sendZaloOA(user.zalo_oa_id, zalo_template_id, zalo_template_data ?? { title, body })
      results.zalo_oa = { sent: outcome.ok, reason: outcome.error }
    }
  }

  // ── Always insert in-app notification ────────────────────────────────────────
  try {
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
    results.in_app = { sent: true }
  } catch (err) {
    console.error('in_app notification insert failed:', err)
    results.in_app = { sent: false, reason: err instanceof Error ? err.message : String(err) }
  }

  return new Response(JSON.stringify({ sent: true, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
  })
})
