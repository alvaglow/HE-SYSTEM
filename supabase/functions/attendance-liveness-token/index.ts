// HE-SYSTEM Edge Function: attendance-liveness-token
//
// WHY THIS FUNCTION EXISTS: attendance-checkin's verifyLivenessToken expects a
// token of the form `${userId}.${timestamp}.${hmacHex}`, signed with
// LIVENESS_SECRET — a server-only secret. The original code comment on that
// function said the token is "signed by the mobile app's on-device liveness
// SDK using the shared LIVENESS_SECRET (never sent to the client)", which is
// a contradiction: if the secret never reaches the client, the client cannot
// compute the HMAC itself. Shipping LIVENESS_SECRET inside the mobile app
// bundle would make it trivially extractable (APKs/IPAs are unpacked
// routinely), defeating the entire point of a server-held signing secret.
//
// The fix: the actual liveness assurance happens ON-DEVICE via the phone's
// own biometric hardware (Face ID / Touch ID / Android biometric prompt —
// see apps/mobile/app/(student)/checkin.tsx, gated by expo-local-authentication
// before this function is ever called). Once the OS confirms the person
// holding the device is who they claim to be, the app calls this function
// with ONLY its own valid session JWT — no biometric data is transmitted,
// nothing new to steal — and the server mints a short-lived signed token
// proving "the authenticated caller passed on-device liveness within the
// last few seconds." attendance-checkin then verifies that token exactly as
// before. This keeps LIVENESS_SECRET server-side while still requiring a
// real on-device biometric pass before a check-in can succeed.
//
// POST body: {} (no fields — the caller's own JWT is the only input)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { requireCaller, authErrorResponse } from '../_shared/auth.ts'
import { requireSecrets, isConfigError, configErrorResponse } from '../_shared/resilience.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const LIVENESS_SECRET = Deno.env.get('LIVENESS_SECRET')

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  const preflight = handleCors(req)
  if (preflight) return preflight

  try {
    requireSecrets(['LIVENESS_SECRET'])

    let caller
    try {
      caller = await requireCaller(req)
    } catch (err) {
      return authErrorResponse(err)
    }

    const timestamp = Date.now()
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', enc.encode(LIVENESS_SECRET!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${caller.userId}:${timestamp}:liveness`))
    const hmacHex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
    const token = `${caller.userId}.${timestamp}.${hmacHex}`

    // Matches attendance-checkin's 30-second freshness window — the mobile
    // app should call this immediately before check-in, not cache the token.
    return json({ token, timestamp })
  } catch (err) {
    if (isConfigError(err)) return configErrorResponse(err)
    console.error('attendance-liveness-token unhandled error:', err)
    return json({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) }, 500)
  }
})
