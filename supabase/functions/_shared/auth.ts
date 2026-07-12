// HE-SYSTEM shared Edge Function helper: caller identity verification
//
// AUDIT FINDING (critical): every edge function previously trusted whatever
// user_id / student_user_id / invoice_id the request body claimed, then used
// the service-role key (which bypasses RLS) to act on it. That means any
// logged-in user could impersonate any other user — e.g. call payment-zalopay
// with someone else's user_id, or attendance-checkin with someone else's
// student_user_id. This file fixes that: every function that acts on behalf
// of a specific user must call `requireCaller` (or `requireStaff`) and check
// the returned identity against whatever the body claims, instead of trusting
// the body directly.
//
// Two kinds of legitimate caller:
//  1. A real end user, invoked via `supabase.functions.invoke(...)` from the
//     browser/mobile client — their Supabase session JWT is attached
//     automatically as the Authorization bearer token. `requireCaller` verifies
//     it and looks up their role/institution.
//  2. Another edge function or a Supabase database webhook calling
//     server-to-server with the SERVICE_ROLE_KEY as the bearer token (this is
//     what happens automatically when one function calls another using the
//     admin client created with the service role key, e.g. commission-calculate
//     notifying a partner via notify-send). `isServiceRoleCall` recognizes this
//     and skips per-user identity checks, since the caller is already fully
//     trusted server-side code, not an end user.
//
// Gateway webhooks (Stripe/ZaloPay/VNPay/MoMo) are a third category and are
// NOT covered here — they authenticate via their own HMAC/signature schemes
// (see each payment-* function), and must be deployed with `verify_jwt = false`
// in supabase/config.toml since they can't produce a Supabase JWT at all.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

export class AuthError extends Error {
  status: number
  constructor(message: string, status = 401) {
    super(message)
    this.status = status
  }
}

export interface AuthedCaller {
  userId: string
  role: string
  institutionId: string
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7)
}

/** True if this request is a trusted server-to-server call (another edge
 * function, or a Supabase DB webhook configured with the service role key). */
export function isServiceRoleCall(req: Request): boolean {
  const token = bearerToken(req)
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token || !serviceKey) return false
  return timingSafeEqual(token, serviceKey)
}

/** Verifies the caller's Supabase session JWT and returns their real identity.
 * Throws AuthError (401/403) if missing, invalid, or the user has no profile row. */
export async function requireCaller(req: Request): Promise<AuthedCaller> {
  const token = bearerToken(req)
  if (!token) throw new AuthError('Missing Authorization bearer token')

  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
  const { data: { user }, error } = await anon.auth.getUser(token)
  if (error || !user) throw new AuthError('Invalid or expired session token')

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: profile } = await admin.from('users').select('role, institution_id').eq('id', user.id).single()
  if (!profile) throw new AuthError('No user profile for this account', 403)

  return { userId: user.id, role: profile.role as string, institutionId: profile.institution_id as string }
}

/** Convenience: caller must be an authenticated staff member (admin/management). */
export async function requireStaff(req: Request): Promise<AuthedCaller> {
  const caller = await requireCaller(req)
  if (caller.role !== 'admin' && caller.role !== 'management') {
    throw new AuthError('Requires admin or management role', 403)
  }
  return caller
}

/** Caller must either be the target user themselves, staff, or a trusted
 * service-role call. Throws AuthError otherwise. Returns null for service-role
 * calls (no per-user identity to check further). */
export async function requireSelfOrStaff(req: Request, targetUserId: string): Promise<AuthedCaller | null> {
  if (isServiceRoleCall(req)) return null
  const caller = await requireCaller(req)
  const isStaff = caller.role === 'admin' || caller.role === 'management'
  if (caller.userId !== targetUserId && !isStaff) {
    throw new AuthError("Cannot act on another user's behalf", 403)
  }
  return caller
}

export function authErrorResponse(err: unknown): Response {
  if (err instanceof AuthError) {
    return new Response(JSON.stringify({ error: err.message }), { status: err.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
