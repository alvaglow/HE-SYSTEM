// HE-SYSTEM Edge Function: commission-calculate
// Trigger: INSERT on partner_recruits WHERE status = 'enrolled'
// Called by: admin action or Supabase database webhook

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BASE_PCT = 8, RATE = 0.4, MAX = 35

function calcPct(n: number) { return Math.min(MAX, BASE_PCT + n * RATE) }
function getTier(n: number) {
  if (n >= 61) return 'platinum'
  if (n >= 31) return 'gold'
  if (n >= 16) return 'silver'
  if (n >= 6)  return 'bronze'
  return 'starter'
}

serve(async (req) => {
  const { recruit_id } = await req.json()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: recruit, error } = await supabase
    .from('partner_recruits')
    .select('*, partners(*)')
    .eq('id', recruit_id)
    .single()

  if (error || !recruit) return new Response('Recruit not found', { status: 404 })
  if (recruit.status !== 'enrolled') return new Response('Not enrolled', { status: 400 })

  const partner = recruit.partners
  const newTotal = partner.total_recruited + 1
  const pct = calcPct(newTotal)
  const earned = parseFloat((recruit.tuition_fee * (pct / 100)).toFixed(2))
  const tier = getTier(newTotal)

  await supabase.from('partner_commissions').insert({
    institution_id: recruit.institution_id,
    partner_id: partner.id,
    recruit_id: recruit.id,
    students_at_time: newTotal,
    commission_pct: pct,
    tuition_fee: recruit.tuition_fee,
    amount_earned: earned,
    tier_at_time: tier,
  })

  await supabase.from('partners')
    .update({ total_recruited: newTotal, total_earned: partner.total_earned + earned })
    .eq('id', partner.id)

  // Notify partner
  await supabase.functions.invoke('notify-send', {
    body: {
      user_id: partner.user_id,
      title: '🎉 Commission Earned!',
      body: `You earned ${earned.toFixed(2)} for a new student enrolment. Rate: ${pct}%`,
      channel: ['push', 'in_app'],
      reference_type: 'commission',
      reference_id: recruit_id,
    }
  })

  return new Response(JSON.stringify({ pct, earned, tier, newTotal }), {
    headers: { 'Content-Type': 'application/json' }, status: 200
  })
})
