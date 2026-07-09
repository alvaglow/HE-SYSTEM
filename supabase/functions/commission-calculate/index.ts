// HE-SYSTEM Edge Function: commission-calculate
// Trigger: INSERT on partner_recruits WHERE status = 'enrolled'
// Called by: admin action or Supabase database webhook
//
// PILOT-LAUNCH HARDENING: added explicit body validation (a missing
// recruit_id used to throw deep inside the `.eq('id', recruit_id)` call
// with an opaque error), a top-level try/catch so any unexpected failure
// returns a structured 500 instead of an unhandled exception, and an
// audit_log entry so commission events are traceable (this function
// previously updated partners/partner_commissions with no audit trail at
// all, unlike the payment-* functions).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isServiceRoleCall, requireStaff, authErrorResponse } from '../_shared/auth.ts'
import { requireFields, isValidationError, validationErrorResponse } from '../_shared/resilience.ts'

const BASE_PCT = 8, RATE = 0.4, MAX = 35

function calcPct(n: number) { return Math.min(MAX, BASE_PCT + n * RATE) }
function getTier(n: number) {
  if (n >= 61) return 'platinum'
  if (n >= 31) return 'gold'
  if (n >= 16) return 'silver'
  if (n >= 6)  return 'bronze'
  return 'starter'
}

// deno-lint-ignore no-explicit-any
async function logAudit(
  supabase: any,
  opts: { institutionId?: string | null; userId?: string | null; action: string; resourceType?: string; resourceId?: string; metadata?: Record<string, unknown> },
) {
  try {
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
  } catch (err) {
    console.error('logAudit failed (non-fatal):', err)
  }
}

serve(async (req) => {
  // AUDIT FIX: this used to be callable by anyone with zero checks, letting
  // any authenticated user credit an arbitrary partner. Only a trusted
  // service-role caller (e.g. a Supabase DB webhook on partner_recruits) or
  // staff (admin/management) may trigger this.
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
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    requireFields(payload, ['recruit_id'])
  } catch (err) {
    if (isValidationError(err)) return validationErrorResponse(err)
    throw err
  }
  const { recruit_id } = payload as { recruit_id: string }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { data: recruit, error } = await supabase
      .from('partner_recruits')
      .select('*, partners(*)')
      .eq('id', recruit_id)
      .single()

    if (error || !recruit) return new Response(JSON.stringify({ error: 'Recruit not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    if (recruit.status !== 'enrolled') return new Response(JSON.stringify({ error: 'Not enrolled' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

    const partner = recruit.partners
    const newTotal = partner.total_recruited + 1
    const pct = calcPct(newTotal)
    const earned = parseFloat((recruit.tuition_fee * (pct / 100)).toFixed(2))
    const tier = getTier(newTotal)

    const { error: commissionErr } = await supabase.from('partner_commissions').insert({
      institution_id: recruit.institution_id,
      partner_id: partner.id,
      recruit_id: recruit.id,
      students_at_time: newTotal,
      commission_pct: pct,
      tuition_fee: recruit.tuition_fee,
      amount_earned: earned,
      tier_at_time: tier,
    })
    if (commissionErr) return new Response(JSON.stringify({ error: commissionErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })

    const { error: updateErr } = await supabase.from('partners')
      .update({ total_recruited: newTotal, total_earned: partner.total_earned + earned })
      .eq('id', partner.id)
    if (updateErr) console.error('Failed to update partner totals (commission row already recorded):', updateErr)

    await logAudit(supabase, {
      institutionId: recruit.institution_id, userId: partner.user_id, action: 'commission.calculated',
      resourceType: 'partner_commission', resourceId: recruit_id, metadata: { pct, earned, tier, newTotal },
    })

    // Notify partner — best-effort, must not fail the whole request if
    // notify-send itself is degraded (e.g. missing notification secrets).
    await supabase.functions.invoke('notify-send', {
      body: {
        user_id: partner.user_id,
        title: '🎉 Commission Earned!',
        body: `You earned ${earned.toFixed(2)} for a new student enrolment. Rate: ${pct}%`,
        channel: ['push', 'in_app'],
        reference_type: 'commission',
        reference_id: recruit_id,
      }
    }).catch((err: unknown) => console.error('notify-send invoke failed (non-fatal):', err))

    return new Response(JSON.stringify({ pct, earned, tier, newTotal }), {
      headers: { 'Content-Type': 'application/json' }, status: 200
    })
  } catch (err) {
    console.error('commission-calculate unhandled error:', err)
    return new Response(JSON.stringify({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
