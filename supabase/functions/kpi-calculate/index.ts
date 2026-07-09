// HE-SYSTEM Edge Function: kpi-calculate
// CRON: runs 1st of every month at 00:00 UTC (configured in supabase/config.toml)
// Calculates previous month KPI for all teachers and staff
//
// PILOT-LAUNCH HARDENING: wrapped the whole batch loop in a top-level
// try/catch (previously an error partway through the teacher loop — e.g. one
// bad row — would throw an unhandled exception and abort with no record of
// how far it got) and added an audit_log summary entry so a KPI run is
// visible in the audit trail alongside payments/attendance.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isServiceRoleCall, requireStaff, authErrorResponse } from '../_shared/auth.ts'

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
  // AUDIT FIX: this recomputes KPI for every teacher/staff member institution-
  // wide. Only the CRON schedule (which Supabase invokes with the service-role
  // key) or staff triggering it manually may run it.
  if (!isServiceRoleCall(req)) {
    try {
      await requireStaff(req)
    } catch (err) {
      return authErrorResponse(err)
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date()
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  let processed = 0
  let failed = 0

  try {
    // Get all teachers
    const { data: teachers, error: teachersErr } = await supabase
      .from('teachers')
      .select('id, user_id, institution_id, max_hours_month')
      .eq('is_active', true)

    if (teachersErr) {
      console.error('kpi-calculate: failed to load teachers:', teachersErr)
      return new Response(JSON.stringify({ error: teachersErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    for (const teacher of teachers ?? []) {
      try {
        // Count classes conducted this month
        const monthStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
        const monthEnd = `${prevYear}-${String(prevMonth).padStart(2, '0')}-31`

        const { count: classCount } = await supabase
          .from('classes')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', teacher.id)
          .gte('starts_at', monthStart)
          .lte('starts_at', monthEnd)
          .eq('is_cancelled', false)

        // Attendance rate across teacher's classes
        const { data: attendanceData } = await supabase
          .from('attendance_records')
          .select('status')
          .in('class_id',
            (await supabase.from('classes').select('id')
              .eq('teacher_id', teacher.id)
              .gte('starts_at', monthStart)
              .lte('starts_at', monthEnd)
            ).data?.map((c: { id: string }) => c.id) ?? []
          )

        const totalAtt = attendanceData?.length ?? 0
        const presentAtt = attendanceData?.filter((a: { status: string }) => a.status === 'present').length ?? 0
        const attendanceRate = totalAtt > 0 ? (presentAtt / totalAtt) * 100 : 0

        // Simplified KPI score (expand with full formula in production)
        const p1 = Math.min(100, ((classCount ?? 0) / (teacher.max_hours_month / 2)) * 100) * 0.25
        const p2 = attendanceRate * 0.35
        const totalScore = parseFloat((p1 + p2 + 70 * 0.25 + 60 * 0.15).toFixed(2))
        const grade = totalScore >= 90 ? 'A' : totalScore >= 75 ? 'B' : totalScore >= 60 ? 'C' : totalScore >= 45 ? 'D' : 'F'

        const { error: upsertErr } = await supabase.from('kpi_records').upsert({
          institution_id: teacher.institution_id,
          user_id: teacher.user_id,
          period_year: prevYear,
          period_month: prevMonth,
          pillar1_score: p1 / 0.25,
          pillar2_score: attendanceRate,
          classes_conducted: classCount ?? 0,
          attendance_rate: attendanceRate,
          total_score: totalScore,
          grade,
          calculated_at: new Date().toISOString(),
        }, { onConflict: 'institution_id,user_id,period_year,period_month' })

        if (upsertErr) {
          failed++
          console.error(`kpi-calculate: failed to upsert KPI for teacher ${teacher.id}:`, upsertErr)
        } else {
          processed++
        }
      } catch (teacherErr) {
        // One bad teacher row must not abort the whole batch — log and continue.
        failed++
        console.error(`kpi-calculate: unexpected error processing teacher ${teacher.id}:`, teacherErr)
      }
    }

    await logAudit(supabase, {
      action: 'kpi.batch_calculated', resourceType: 'kpi_records',
      metadata: { period: `${prevYear}-${prevMonth}`, processed, failed, total: teachers?.length ?? 0 },
    })

    return new Response(JSON.stringify({ processed, failed, period: `${prevYear}-${prevMonth}` }), {
      headers: { 'Content-Type': 'application/json' }, status: 200
    })
  } catch (err) {
    console.error('kpi-calculate unhandled error:', err)
    return new Response(JSON.stringify({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err), processed, failed }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
