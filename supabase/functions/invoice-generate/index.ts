// HE-SYSTEM Edge Function: invoice-generate
// POST body: { student_id, programme_id, amount, due_date, description?, institution_id }
//
// PILOT-LAUNCH HARDENING: added explicit field validation (previously a
// missing `amount` would throw inside `amount.toFixed(2)` deep in the
// notify-send call rather than failing fast with a 400), a top-level
// try/catch for unhandled errors, and an audit_log entry — invoices move
// money-adjacent state (fee_invoices) and had no audit trail at all before.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { invoiceEmailHtml } from '../_shared/email-template.ts'
import { isServiceRoleCall, requireStaff, authErrorResponse } from '../_shared/auth.ts'
import { requireFields, isValidationError, validationErrorResponse } from '../_shared/resilience.ts'

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
  // AUDIT FIX: previously any authenticated user could generate an invoice
  // for any student. Only staff (admin/management) or a trusted service-role
  // caller may create invoices.
  let callerUserId: string | null = null
  if (!isServiceRoleCall(req)) {
    try {
      const caller = await requireStaff(req)
      callerUserId = caller.userId
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
    requireFields(payload, ['student_id', 'programme_id', 'amount', 'due_date', 'institution_id'])
  } catch (err) {
    if (isValidationError(err)) return validationErrorResponse(err)
    throw err
  }

  const { student_id, programme_id, amount, due_date, description, institution_id } = payload as {
    student_id: string; programme_id: string; amount: number; due_date: string; description?: string; institution_id: string
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return new Response(JSON.stringify({ error: 'amount must be a positive number' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
  if (Number.isNaN(Date.parse(due_date))) {
    return new Response(JSON.stringify({ error: 'due_date must be a valid date' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Generate invoice number: HE-YYYY-NNNN
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('fee_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institution_id)

    const seq = (count ?? 0) + 1
    const invoiceNumber = `HE-${year}-${String(seq).padStart(4, '0')}`

    const { data: invoice, error } = await supabase
      .from('fee_invoices')
      .insert({
        institution_id,
        invoice_number: invoiceNumber,
        student_id,
        programme_id,
        amount,
        currency: 'MYR',
        status: 'sent',
        issued_date: new Date().toISOString().split('T')[0],
        due_date,
        description: description ?? `Tuition fee — ${year}`,
      })
      .select()
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })

    await logAudit(supabase, {
      institutionId: institution_id, userId: callerUserId, action: 'invoice.generated',
      resourceType: 'fee_invoice', resourceId: invoice.id, metadata: { invoiceNumber, studentId: student_id, amount, dueDate: due_date },
    })

    // Get student user_id + name/email for notification
    const { data: student } = await supabase
      .from('students').select('user_id, users(full_name, email)').eq('id', student_id).single()

    // Notify student — best-effort; the invoice itself is already committed,
    // so a notification failure must not turn into a 500 for a successfully
    // created invoice.
    if (student) {
      const studentUser = (student as unknown as { users: { full_name: string; email: string } }).users
      await supabase.functions.invoke('notify-send', {
        body: {
          user_id: student.user_id,
          title: '📋 New Invoice',
          body: `Invoice ${invoiceNumber} for RM${amount.toFixed(2)} is due on ${due_date}.`,
          html_body: invoiceEmailHtml({
            invoiceNumber, studentName: studentUser?.full_name ?? 'Student', email: studentUser?.email,
            amount, currency: 'MYR', dueDate: due_date, status: 'sent', description: description ?? `Tuition fee — ${year}`,
          }),
          channel: ['push', 'email', 'in_app'],
          reference_type: 'invoice',
          reference_id: invoice.id,
        }
      }).catch((err: unknown) => console.error('notify-send invoke failed (non-fatal):', err))
    }

    return new Response(JSON.stringify(invoice), {
      headers: { 'Content-Type': 'application/json' }, status: 201
    })
  } catch (err) {
    console.error('invoice-generate unhandled error:', err)
    return new Response(JSON.stringify({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
