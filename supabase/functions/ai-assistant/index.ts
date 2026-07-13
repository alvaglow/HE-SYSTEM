// HE-SYSTEM Edge Function: ai-assistant
//
// APSpace-inspired feature ("AIDA"): a chat assistant students can ask about
// their own academic/financial status. This is an original implementation,
// not a copy of AIDA's UI or branding — it answers using Claude (Anthropic's
// API) grounded in facts fetched server-side for the *authenticated caller
// only*, never client-supplied data, so one user can never probe another
// user's records through the assistant.
//
// Design notes:
//  - Auth: requireCaller (see _shared/auth.ts) — every request must carry a
//    real Supabase session JWT. There is no service-role/anonymous path.
//  - Context: fetched fresh per-request with the service-role client, scoped
//    to caller.userId/institutionId only. The richest context is built for
//    students (fees, attendance, CGPA, next class) since that mirrors
//    AIDA's actual scope; other roles get a lighter context so the endpoint
//    still works but doesn't pretend to know things it doesn't fetch.
//  - The model only ever sees the JSON "facts" block plus the user's
//    question — it is explicitly instructed not to invent information and
//    to defer to a human office for anything not in the facts.
//  - Requires the ANTHROPIC_API_KEY secret. Missing-secret returns a 503 via
//    the shared resilience helpers, not a raw crash.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireCaller, authErrorResponse } from '../_shared/auth.ts'
import { requireFields, requireSecrets, isValidationError, isConfigError, validationErrorResponse, configErrorResponse, fetchWithTimeout } from '../_shared/resilience.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

const MODEL = Deno.env.get('AI_ASSISTANT_MODEL') || 'claude-haiku-4-5-20251001'

serve(async (req) => {
  const preflight = handleCors(req)
  if (preflight) return preflight

  let caller
  try {
    caller = await requireCaller(req)
  } catch (err) {
    return authErrorResponse(err)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  try {
    requireFields(body, ['question'])
    requireSecrets(['ANTHROPIC_API_KEY'])
  } catch (err) {
    if (isValidationError(err)) return validationErrorResponse(err)
    if (isConfigError(err)) return configErrorResponse(err)
    throw err
  }

  const question = String(body.question).slice(0, 1000)
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const facts: Record<string, unknown> = { role: caller.role }

  const { data: me } = await supabase.from('users').select('full_name').eq('id', caller.userId).single()
  facts.name = (me as unknown as { full_name: string | null } | null)?.full_name ?? null

  if (caller.role === 'student') {
    const { data: studentRaw } = await supabase
      .from('students').select('id, programmes(name)').eq('user_id', caller.userId).single()
    const student = studentRaw as unknown as { id: string; programmes: { name?: string } | null } | null
    facts.programme = student?.programmes?.name ?? null

    if (student?.id) {
      const nowIso = new Date().toISOString()
      const [attendanceRes, invoicesRes, resultsRes, nextClassRes] = await Promise.all([
        supabase.from('attendance_records').select('status').eq('student_id', student.id),
        supabase.from('fee_invoices').select('amount, amount_paid, currency, due_date, status').eq('student_id', student.id).in('status', ['sent', 'overdue']),
        supabase.from('exam_results').select('grade, assessment_type, subjects(name, credit_hours)').eq('student_id', student.id).eq('is_published', true),
        supabase.from('class_enrollments').select('classes(title, starts_at, subjects(name))').eq('student_id', student.id).eq('is_active', true),
      ])

      const attendanceRows = (attendanceRes.data ?? []) as Array<{ status: string }>
      const total = attendanceRows.length
      const present = attendanceRows.filter(r => r.status === 'present' || r.status === 'late').length
      facts.attendance_percent = total > 0 ? Math.round((present / total) * 100) : null

      const invoices = (invoicesRes.data ?? []) as Array<{ amount: number; amount_paid: number; currency: string; due_date: string | null; status: string }>
      facts.outstanding_fees = invoices.map(i => ({
        balance: Number(i.amount) - Number(i.amount_paid), currency: i.currency, due_date: i.due_date, status: i.status,
      }))

      const results = (resultsRes.data ?? []) as unknown as Array<{ grade: string | null; assessment_type: string | null; subjects: { name: string; credit_hours: number | null } | null }>
      facts.published_results = results
        .filter(r => (r.assessment_type ?? '').toLowerCase().includes('final'))
        .map(r => ({ subject: r.subjects?.name ?? 'Subject', grade: r.grade }))

      const enrollments = (nextClassRes.data ?? []) as unknown as Array<{ classes: { title: string | null; starts_at: string; subjects: { name: string } | null } | null }>
      const upcoming = enrollments
        .map(e => e.classes)
        .filter((c): c is { title: string | null; starts_at: string; subjects: { name: string } | null } => !!c && c.starts_at > nowIso)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0]
      facts.next_class = upcoming ? { subject: upcoming.subjects?.name ?? upcoming.title ?? 'Class', starts_at: upcoming.starts_at } : null
    }
  }

  const systemPrompt = `You are the HE-SYSTEM campus assistant. Answer the user's question using ONLY the facts JSON provided below — never invent information that isn't there. If the facts don't cover what's being asked, say you don't have that information and suggest they contact the relevant campus office (admin office for fees, academic office for results, IT helpdesk for technical issues). Keep answers to 2-4 sentences, friendly and direct.

Facts about this user:
${JSON.stringify(facts, null, 2)}`

  let answer: string
  try {
    const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }],
      }),
    }, 15000)

    if (!res.ok) {
      const text = await res.text()
      console.error('ai-assistant: Anthropic API error', res.status, text)
      return json({ error: 'Assistant is temporarily unavailable' }, 502)
    }

    const data = await res.json()
    answer = data?.content?.[0]?.text ?? "Sorry, I couldn't come up with an answer just now."
  } catch (err) {
    console.error('ai-assistant: request failed', err)
    return json({ error: 'Assistant is temporarily unavailable' }, 502)
  }

  return json({ answer })
})
