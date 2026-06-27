// HE-SYSTEM Edge Function: invoice-generate
// POST body: { student_id, programme_id, amount, due_date, description?, institution_id }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { student_id, programme_id, amount, due_date, description, institution_id } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

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

  if (error) return new Response(error.message, { status: 500 })

  // Get student user_id for notification
  const { data: student } = await supabase
    .from('students').select('user_id').eq('id', student_id).single()

  // Notify student
  if (student) {
    await supabase.functions.invoke('notify-send', {
      body: {
        user_id: student.user_id,
        title: '📋 New Invoice',
        body: `Invoice ${invoiceNumber} for RM${amount.toFixed(2)} is due on ${due_date}.`,
        channel: ['push', 'email', 'in_app'],
        reference_type: 'invoice',
        reference_id: invoice.id,
      }
    })
  }

  return new Response(JSON.stringify(invoice), {
    headers: { 'Content-Type': 'application/json' }, status: 201
  })
})
