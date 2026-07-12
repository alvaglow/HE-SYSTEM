import { createClient } from '@/lib/supabase/server'

function formatClassTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('full_name').eq('id', user!.id).single()
  const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', user!.id).single()

  // AUDIT FIX: this whole dashboard used to render "—" for every stat and a
  // static "Connect to Supabase to load your schedule" note regardless of
  // who was signed in. All four cards and the class list below are now real
  // queries scoped to this teacher.

  const teacherId = teacher?.id ?? null
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)

  const [kpiResRaw, classesTodayRes, pendingMarkingRes, myClassesRes] = await Promise.all([
    supabase.from('kpi_records').select('total_score, grade').eq('user_id', user!.id)
      .order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(1).maybeSingle(),
    teacherId
      ? supabase.from('classes').select('id, title, starts_at, subjects(name)', { count: 'exact' })
          .eq('teacher_id', teacherId).eq('is_cancelled', false)
          .gte('starts_at', todayStart.toISOString()).lte('starts_at', todayEnd.toISOString())
          .order('starts_at', { ascending: true })
      : Promise.resolve({ data: [] as { id: string; title: string | null; starts_at: string; subjects: { name: string } | null }[], count: 0 }),
    teacherId ? supabase.from('exam_results').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId).is('score', null) : Promise.resolve({ count: 0 }),
    teacherId ? supabase.from('classes').select('id').eq('teacher_id', teacherId) : Promise.resolve({ data: [] as { id: string }[] }),
  ])

  // AUDIT FIX (build): plain (non-embedded-relation) Supabase selects can
  // still have their result type collapse to `never` under this project's
  // generated Database types (seen with kpi_records elsewhere too) — cast
  // once here rather than fighting the generated types.
  const kpiRes = kpiResRaw as unknown as { data: { total_score: number | null; grade: string | null } | null }

  // At-risk students: enrolled in one of this teacher's classes, with an
  // attendance rate under 75% across at least 3 recorded sessions there.
  const classIds = (myClassesRes.data ?? []).map(c => c.id)
  let atRiskCount = 0
  if (classIds.length > 0) {
    const { data: recordsRaw } = await supabase.from('attendance_records').select('student_id, status').in('class_id', classIds)
    const records = (recordsRaw ?? []) as unknown as { student_id: string; status: string }[]
    const byStudent = new Map<string, { present: number; total: number }>()
    for (const r of records ?? []) {
      const entry = byStudent.get(r.student_id) ?? { present: 0, total: 0 }
      entry.total += 1
      if (r.status === 'present' || r.status === 'late') entry.present += 1
      byStudent.set(r.student_id, entry)
    }
    atRiskCount = [...byStudent.values()].filter(v => v.total >= 3 && v.present / v.total < 0.75).length
  }

  const classesToday = classesTodayRes.data ?? []

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-1">
        Teacher Dashboard
      </h1>
      <p className="text-gray-500 text-sm mb-8">Welcome, {profile?.full_name}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="card border-l-4 border-brand-blue">
          <p className="text-xs text-gray-500 mb-1">KPI Score</p>
          <p className="text-2xl font-display font-bold text-brand-blue">
            {kpiRes.data?.total_score != null ? `${kpiRes.data.total_score} (${kpiRes.data.grade})` : 'No data yet'}
          </p>
        </div>
        <div className="card border-l-4 border-green-500">
          <p className="text-xs text-gray-500 mb-1">Classes Today</p>
          <p className="text-2xl font-display font-bold text-green-600">{classesToday.length}</p>
        </div>
        <div className="card border-l-4 border-brand-gold">
          <p className="text-xs text-gray-500 mb-1">Pending Marking</p>
          <p className="text-2xl font-display font-bold text-amber-600">{pendingMarkingRes.count ?? 0}</p>
        </div>
        <div className="card border-l-4 border-brand-red">
          <p className="text-xs text-gray-500 mb-1">At-Risk Students</p>
          <p className="text-2xl font-display font-bold text-brand-red">{atRiskCount}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Today&apos;s Classes</h2>
        {classesToday.length > 0 ? (
          <ul className="space-y-3">
            {classesToday.map(c => (
              <li key={c.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{c.title || (c.subjects as unknown as { name?: string })?.name || 'Class'}</span>
                <span className="text-gray-400">{formatClassTime(c.starts_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">No classes scheduled for today.</p>
        )}
      </div>
    </div>
  )
}
