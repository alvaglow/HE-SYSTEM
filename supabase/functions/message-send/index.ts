// HE-SYSTEM Edge Function: message-send
// NEW (Phase 3): every ComposeForm (web) and messages screen (mobile) used to
// insert directly into `messages` from the client. That works fine for RLS,
// but there was no way to notify the recipient of a new message without
// giving ordinary users a way to call notify-send directly (which is
// deliberately locked to service-role/staff callers — see
// _shared/auth.ts). This function verifies the real caller via
// `requireCaller`, performs the insert itself with its own service-role
// client (so RLS is irrelevant here — the identity check already happened),
// and then calls notify-send server-to-server. Callers no longer insert into
// `messages` directly; they call this function instead.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireCaller, authErrorResponse } from '../_shared/auth.ts'
import { requireFields, isValidationError, validationErrorResponse } from '../_shared/resilience.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

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
    requireFields(body, ['recipient_id', 'content'])
  } catch (err) {
    if (isValidationError(err)) return validationErrorResponse(err)
    throw err
  }

  const { recipient_id, content } = body as { recipient_id: string; content: string }
  if (!content.trim()) return json({ error: 'Message cannot be empty' }, 400)
  if (recipient_id === caller.userId) return json({ error: 'Cannot message yourself' }, 400)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Recipient must exist in the same institution — prevents cross-tenant
  // messaging even though this function runs with the service-role key.
  const { data: recipient, error: recipientErr } = await supabase
    .from('users').select('id, institution_id, full_name').eq('id', recipient_id).single()
  if (recipientErr || !recipient) return json({ error: 'Recipient not found' }, 404)
  if (recipient.institution_id !== caller.institutionId) return json({ error: 'Recipient is not in your institution' }, 403)

  const { data: sender } = await supabase.from('users').select('full_name').eq('id', caller.userId).single()

  const { data: message, error: insertErr } = await supabase
    .from('messages')
    .insert({ institution_id: caller.institutionId, sender_id: caller.userId, recipient_id, content } as unknown as never)
    .select('id, sender_id, recipient_id, content, created_at')
    .single()

  if (insertErr) return json({ error: insertErr.message }, 500)

  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    await fetch(`${Deno.env.get('SUPABASE_URL')!}/functions/v1/notify-send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: recipient_id,
        title: `New message from ${sender?.full_name ?? 'someone'}`,
        body: content.length > 140 ? `${content.slice(0, 137)}...` : content,
        channel: ['in_app', 'push'],
        reference_type: 'messages',
        reference_id: message.id,
      }),
    })
  } catch (err) {
    // A notification failure must never fail the send itself.
    console.error('message-send: notify-send call failed (non-fatal):', err)
  }

  return json({ message })
})
