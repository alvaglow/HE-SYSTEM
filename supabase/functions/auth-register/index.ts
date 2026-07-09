/**
 * HE-SYSTEM — Public self-registration
 * supabase/functions/auth-register/index.ts
 *
 * AUDIT FIX: apps/web/middleware.ts and the login page both reference
 * `/register`, but no such page (or any server-side provisioning logic)
 * existed. It can't be "just a page" though: the `users` table has no INSERT
 * RLS policy at all (see 001_initial_schema.sql — only "own row" SELECT and
 * "update own" UPDATE policies exist), so a browser can never insert its own
 * profile row directly. Profile creation has to happen with the service role,
 * server-side, after the auth account is created — hence this function.
 *
 * Flow:
 *   1. Create the Supabase Auth user via the ANON client's normal signUp()
 *      (so Supabase's built-in confirmation email flow runs exactly like any
 *      other Supabase project — no custom email templates to build).
 *   2. Look up the institution by slug using the service-role client.
 *   3. Insert the `users` profile row (service role bypasses RLS).
 *   4. Insert the matching `students` or `partners` row for that role.
 *
 * Self-registration is intentionally limited to 'student' and 'partner' —
 * the two roles that plausibly sign themselves up. Staff/teacher/admin
 * accounts are provisioned by an institution admin, not through this
 * function.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ROLES = new Set(['student', 'partner'])

function randomCode(prefix: string): string {
  const rand = crypto.getRandomValues(new Uint32Array(2))
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${rand[0].toString(36).toUpperCase()}`
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let payload: {
    email?: string; password?: string; full_name?: string
    institution_slug?: string; role?: string
  }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { email, password, full_name, institution_slug, role } = payload

  if (!email || !password || !full_name || !institution_slug || !role) {
    return json({ error: 'email, password, full_name, institution_slug, and role are all required' }, 400)
  }
  if (!ALLOWED_ROLES.has(role)) {
    return json({ error: `role must be one of: ${[...ALLOWED_ROLES].join(', ')}` }, 400)
  }
  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters' }, 400)
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const anon = createClient(url, anonKey)
  const admin = createClient(url, serviceKey)

  try {
    // 1. Look up institution first — fail fast before creating an auth account
    //    for an institution that doesn't exist.
    const { data: institution, error: instErr } = await admin
      .from('institutions')
      .select('id, is_active')
      .eq('slug', institution_slug)
      .maybeSingle()

    if (instErr) return json({ error: 'Failed to look up institution' }, 500)
    if (!institution || !institution.is_active) {
      return json({ error: 'Unknown or inactive institution' }, 400)
    }

    // 2. Create the auth account (Supabase sends its own confirmation email).
    const { data: signUpData, error: signUpError } = await anon.auth.signUp({ email, password })
    if (signUpError) return json({ error: signUpError.message }, 400)

    const userId = signUpData.user?.id
    if (!userId) return json({ error: 'Account creation did not return a user id' }, 500)

    // 3. Insert the profile row with the service role (bypasses RLS, which has
    //    no public INSERT policy on `users` by design).
    const { error: profileErr } = await admin.from('users').insert({
      id: userId,
      institution_id: institution.id,
      role,
      full_name,
      email,
    })

    if (profileErr) {
      // Roll back the orphaned auth account rather than leaving a user who can
      // log in but has no profile row (which every RLS policy depends on).
      await admin.auth.admin.deleteUser(userId).catch((err) => console.error('Rollback deleteUser failed:', err))
      return json({ error: 'Failed to create user profile: ' + profileErr.message }, 500)
    }

    // 4. Insert the role-specific row. If this fails, the account and profile
    //    already exist — log loudly rather than silently leaving a
    //    student/partner with no role-specific row (dashboards would show
    //    empty data with no indication why).
    if (role === 'student') {
      const { error: roleErr } = await admin.from('students').insert({
        user_id: userId,
        institution_id: institution.id,
        student_number: randomCode('STU'),
      })
      if (roleErr) console.error('Failed to create students row for new user', userId, roleErr)
    } else if (role === 'partner') {
      const { error: roleErr } = await admin.from('partners').insert({
        user_id: userId,
        institution_id: institution.id,
        referral_code: randomCode('REF'),
      })
      if (roleErr) console.error('Failed to create partners row for new user', userId, roleErr)
    }

    return json({
      success: true,
      user_id: userId,
      needs_email_confirmation: !signUpData.session,
    })
  } catch (err) {
    console.error('auth-register unhandled error:', err)
    return json({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) }, 500)
  }
})
