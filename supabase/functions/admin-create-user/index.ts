/**
 * HE-SYSTEM — Admin-provisioned user creation
 * supabase/functions/admin-create-user/index.ts
 *
 * The `users` table has no public INSERT policy (by design — see
 * auth-register), and creating a Supabase Auth account at all requires either
 * the anon signUp() flow (self-registration, limited to student/partner) or
 * the service-role admin API (this function). Admins/management need to be
 * able to create ANY role — staff, teachers, parents, other admins — which
 * self-registration deliberately does not allow. This function is that path.
 *
 * Unlike auth-register, the account is created already email-confirmed (an
 * admin vouching for the person is sufficient — no confirmation email round
 * trip) and the institution is taken from the CALLER's own institution_id,
 * never from the request body, so one institution's admin can never create
 * users in another institution.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireStaff, authErrorResponse } from '../_shared/auth.ts'

const ALLOWED_ROLES = new Set(['student', 'teacher', 'staff', 'parent', 'partner', 'admin', 'management'])

function randomCode(prefix: string): string {
  const rand = crypto.getRandomValues(new Uint32Array(2))
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${rand[0].toString(36).toUpperCase()}`
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let caller
  try {
    caller = await requireStaff(req)
  } catch (err) {
    return authErrorResponse(err)
  }

  let payload: {
    email?: string; password?: string; full_name?: string; role?: string
    programme_id?: string; department_id?: string; position?: string
    student_number?: string; employee_number?: string
  }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { email, password, full_name, role } = payload
  if (!email || !password || !full_name || !role) {
    return json({ error: 'email, password, full_name, and role are all required' }, 400)
  }
  if (!ALLOWED_ROLES.has(role)) {
    return json({ error: `role must be one of: ${[...ALLOWED_ROLES].join(', ')}` }, 400)
  }
  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters' }, 400)
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(url, serviceKey)

  try {
    // 1. Create the auth account, already confirmed — an admin creating the
    //    account is sufficient vouching, unlike self-registration.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (createErr) return json({ error: createErr.message }, 400)

    const userId = created.user?.id
    if (!userId) return json({ error: 'Account creation did not return a user id' }, 500)

    // 2. Insert the profile row — institution_id comes from the CALLER's own
    //    profile, never the request body, so this can't be used to create
    //    users in a different institution.
    const { error: profileErr } = await admin.from('users').insert({
      id: userId,
      institution_id: caller.institutionId,
      role,
      full_name,
      email,
    })
    if (profileErr) {
      await admin.auth.admin.deleteUser(userId).catch((err) => console.error('Rollback deleteUser failed:', err))
      return json({ error: 'Failed to create user profile: ' + profileErr.message }, 500)
    }

    // 3. Insert the role-specific row, matching each table's required columns.
    let roleErr: { message: string } | null = null
    if (role === 'student') {
      ;({ error: roleErr } = await admin.from('students').insert({
        user_id: userId,
        institution_id: caller.institutionId,
        programme_id: payload.programme_id ?? null,
        student_number: payload.student_number || randomCode('STU'),
      }))
    } else if (role === 'teacher') {
      ;({ error: roleErr } = await admin.from('teachers').insert({
        user_id: userId,
        institution_id: caller.institutionId,
        department_id: payload.department_id ?? null,
        employee_number: payload.employee_number || randomCode('TCH'),
      }))
    } else if (role === 'staff' || role === 'admin' || role === 'management') {
      ;({ error: roleErr } = await admin.from('staff').insert({
        user_id: userId,
        institution_id: caller.institutionId,
        department_id: payload.department_id ?? null,
        employee_number: payload.employee_number || randomCode('STF'),
        position: payload.position ?? role,
      }))
    } else if (role === 'partner') {
      ;({ error: roleErr } = await admin.from('partners').insert({
        user_id: userId,
        institution_id: caller.institutionId,
        referral_code: randomCode('REF'),
      }))
    }
    // 'parent' has no role-specific table — linking to children happens
    // separately via parent_student_links (admin/enrolment page).

    if (roleErr) console.error(`Failed to create ${role}-specific row for new user`, userId, roleErr)

    return json({ success: true, user_id: userId })
  } catch (err) {
    console.error('admin-create-user unhandled error:', err)
    return json({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) }, 500)
  }
})
