// HE-SYSTEM Edge Function: kpi-calculate
// CRON: runs 1st of every month at 00:00 UTC (configured in supabase/config.toml)
// Calculates previous month KPI for all teachers and staff

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date()
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  // Get all teachers
  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, user_id, institution_id, max_hours_month')
    .eq('is_active', true)

  for (const teacher of teachers ?? []) {
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
        ).data?.map(c => c.id) ?? []
      )

    const totalAtt = attendanceData?.length ?? 0
    const presentAtt = attendanceData?.filter(a => a.status === 'present').length ?? 0
    const attendanceRate = totalAtt > 0 ? (presentAtt / totalAtt) * 100 : 0

    // Simplified KPI score (expand with full formula in production)
    const p1 = Math.min(100, ((classCount ?? 0) / (teacher.max_hours_month / 2)) * 100) * 0.25
    const p2 = attendanceRate * 0.35
    const totalScore = parseFloat((p1 + p2 + 70 * 0.25 + 60 * 0.15).toFixed(2))
    const grade = totalScore >= 90 ? 'A' : totalScore >= 75 ? 'B' : totalScore >= 60 ? 'C' : totalScore >= 45 ? 'D' : 'F'

    await supabase.from('kpi_records').upsert({
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
  }

  return new Response(JSON.stringify({ processed: teachers?.length ?? 0, period: `${prevYear}-${prevMonth}` }), {
    headers: { 'Content-Type': 'application/json' }, status: 200
  })
})
