// HE-SYSTEM Edge Function: invoice-due-reminder
// NEW (Phase 3): scheduled daily job that notifies students + their linked
// parents about fees due soon or overdue, and flips 'sent' invoices past
// their due_date to 'overdue'. Intended to be driven by pg_cron (see
// supabase/migrations for the cron.schedule(...) job) using the shared
// x-cron-secret described in _shared/cron.ts, but staff can also trigger it
// manually from the admin Finance page for an on-demand sweep.
//
// Reminder cadence (kept simple and predictable):
//   - 3 days before due_date
//   - 1 day before due_date
//   - on due_date itself
//   - every 7 days once overdue (so an overdue invoice doesn't get silent)
// A `notifications` row already exists per user/day/invoice check prevents
// double-sending if the job is triggered more than once on the same day.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isServiceRoleCall, requireStaff, authErrorResponse } from '../_shared/auth.ts'
import { isCronCall } from '../_shared/cron.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

// deno-lint-ignore no-explicit-any
async function logAudit(supabase: any, opts: { action: string; metadata?: Record<string, unknown> }) {
  try {
    const { data: prev } = await supabase.from('audit_log').select('hash').order('created_at', { ascending: false }).limit(1).maybeSingle()
    const prevHash = (prev as { hash?: string } | null)?.hash ?? 'GENESIS'
    const ts = new Date().toISOString()
    const chainInput = `${prevHash}|cron|${opts.action}|${ts}`
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(chainInput))
    const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
    await supabase.from('audit_log').insert({
      action: opts.action, metadata: opts.metadata ?? {}, prev_hash: prevHash, hash, created_at: ts,
    })
  } catch (err) {
    console.error('logAudit failed (non-fatal):', err)
  }
}

// deno-lint-ignore no-explicit-any
async function alreadyNotifiedToday(supabase: any, userId: string, invoiceId: string): Promise<boolean> {
  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0)
  const { count } = await supabase.from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('reference_type', 'fee_invoices').eq('reference_id', invoiceId)
    .gte('created_at', todayStart.toISOString())
  return (count ?? 0) > 0
}

// deno-lint-ignore no-explicit-any
async function notify(supabase: any, userId: string, title: string, body: string, invoiceId: string) {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  await fetch(`${Deno.env.get('SUPABASE_URL')!}/functions/v1/notify-send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, title, body, channel: ['in_app', 'push', 'email'], reference_type: 'fee_invoices', reference_id: invoiceId }),
  })
}

serve(async (req) => {
  const preflight = handleCors(req)
  if (preflight) return preflight

  if (!isServiceRoleCall(req) && !isCronCall(req)) {
    try {
      await requireStaff(req)
    } catch (err) {
      return authErrorResponse(err)
    }
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  let notified = 0
  let markedOverdue = 0
  let checked = 0

  try {
    const { data: invoices, error } = await supabase
      .from('fee_invoices')
      .select('id, invoice_number, amount, amount_paid, due_date, status, student_id, students(user_id, users(full_name))')
      .in('status', ['sent', 'overdue'])
      .not('due_date', 'is', null)

    if (error) return json({ error: error.message }, 500)

    for (const inv of invoices ?? []) {
      checked++
      const due = new Date(`${inv.due_date}T00:00:00Z`)
      const daysUntilDue = Math.round((due.getTime() - new Date(`${todayStr}T00:00:00Z`).getTime()) / 86400000)

      // Flip to overdue once past due_date.
      if (inv.status === 'sent' && daysUntilDue < 0) {
        await supabase.from('fee_invoices').update({ status: 'overdue', updated_at: new Date().toISOString() }).eq('id', inv.id)
        markedOverdue++
      }

      const shouldNotify = daysUntilDue === 3 || daysUntilDue === 1 || daysUntilDue === 0 || (daysUntilDue < 0 && Math.abs(daysUntilDue) % 7 === 0)
      if (!shouldNotify) continue

      const student = (inv as unknown as { students: { user_id: string; users: { full_name: string | null } | null } | null }).students
      if (!student?.user_id) continue

      const remaining = Number(inv.amount) - Number(inv.amount_paid ?? 0)
      const label = daysUntilDue > 0 ? `due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}` : daysUntilDue === 0 ? 'due today' : `${Math.abs(daysUntilDue)} days overdue`
      const title = daysUntilDue < 0 ? 'Invoice overdue' : 'Invoice due soon'
      const body = `Invoice ${inv.invoice_number} (${remaining.toLocaleString()} ${label}).`

      // Notify the student.
      if (!(await alreadyNotifiedToday(supabase, student.user_id, inv.id))) {
        await notify(supabase, student.user_id, title, body, inv.id)
        notified++
      }

      // Notify linked parent(s) too — they're often the ones who actually pay.
      const { data: parentLinks } = await supabase.from('parent_student_links').select('parent_user_id').eq('student_id', inv.student_id)
      for (const link of parentLinks ?? []) {
        if (!link.parent_user_id) continue
        if (await alreadyNotifiedToday(supabase, link.parent_user_id, inv.id)) continue
        await notify(supabase, link.parent_user_id, title, body, inv.id)
        notified++
      }
    }

    await logAudit(supabase, { action: 'invoice_due_reminder.run', metadata: { checked, notified, markedOverdue, date: todayStr } })

    return json({ checked, notified, markedOverdue })
  } catch (err) {
    console.error('invoice-due-reminder unhandled error:', err)
    return json({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) }, 500)
  }
})
