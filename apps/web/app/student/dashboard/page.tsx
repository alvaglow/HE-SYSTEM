import { createClient } from '@/lib/supabase/server'
import PayNowButton from './PayNowButton'
import QuickAccessGrid from './QuickAccessGrid'
import { calculateCgpa } from '@he-system/shared/utils/gpa-calculator'

const QUICK_ACCESS = [
  { href: '/student/attendance', icon: '📅', label: 'Attendance', color: 'text-brand-blue bg-brand-blue-100' },
  { href: '/student/timetable', icon: '🗓️', label: 'Timetable', color: 'text-brand-blue bg-brand-blue-100' },
  { href: '/student/results', icon: '🎓', label: 'Results', color: 'text-green-700 bg-green-50' },
  { href: '/student/fees', icon: '💳', label: 'Fees', color: 'text-brand-red bg-brand-red-100' },
  { href: '/student/wallet', icon: '👛', label: 'Wallet', color: 'text-purple-700 bg-purple-50' },
  { href: '/student/location', icon: '📍', label: 'Location', color: 'text-purple-700 bg-purple-50' },
  { href: '/student/messages', icon: '💬', label: 'Messages', color: 'text-amber-700 bg-brand-gold-100' },
  { href: '/student/announcements', icon: '📰', label: 'News & Events', color: 'text-gray-700 bg-gray-100' },
  { href: '/student/library', icon: '📚', label: 'Library', color: 'text-brand-blue bg-brand-blue-100' },
  { href: '/student/directory', icon: '🧑‍🏫', label: 'Staff Directory', color: 'text-green-700 bg-green-50' },
  { href: '/student/profile', icon: '🪪', label: 'My Profile', color: 'text-gray-700 bg-gray-100' },
  { href: '/student/facilities', icon: '🏫', label: 'Facility Finder', color: 'text-brand-blue bg-brand-blue-100' },
  { href: '/student/exams', icon: '📝', label: 'Exam Timetable', color: 'text-brand-red bg-brand-red-100' },
  { href: '/student/transcript', icon: '📜', label: 'Transcript', color: 'text-green-700 bg-green-50' },
  { href: '/student/financial-aid', icon: '🎓', label: 'Financial Aid', color: 'text-amber-700 bg-brand-gold-100' },
  { href: '/student/shuttle', icon: '🚌', label: 'Campus Shuttle', color: 'text-brand-blue bg-brand-blue-100' },
]

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: currency === 'VND' ? 0 : 2 }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function formatClassTime(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return isToday ? `Today ${time}` : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` ${time}`
}

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileRaw } = await supabase.from('users').select('full_name, institution_id, accent_color, dashboard_tile_order').eq('id', user!.id).single()
  // AUDIT FIX (build): plain (non-embedded-relation) selects can still
  // collapse to `never` under this project's generated Database types
  // (same issue as `studentData` below). Cast once here.
  const profile = profileRaw as unknown as {
    full_name: string | null; institution_id: string; accent_color: string | null; dashboard_tile_order: string[] | null
  } | null

  const orderedTiles = (() => {
    const order = profile?.dashboard_tile_order
    if (!order || order.length === 0) return QUICK_ACCESS
    const byHref = new Map(QUICK_ACCESS.map(t => [t.href, t]))
    const ordered = order.map(href => byHref.get(href)).filter((t): t is typeof QUICK_ACCESS[number] => !!t)
    const missing = QUICK_ACCESS.filter(t => !order.includes(t.href))
    return [...ordered, ...missing]
  })()
  const { data: student } = await supabase.from('students').select('id, programme_id, programmes(name)').eq('user_id', user!.id).single()

  // AUDIT FIX: Supabase's generated types couldn't resolve the
  // `programmes(name)` embedded-resource shape on this query, which collapsed
  // `student` to `never` and broke the build with "Property 'id' does not
  // exist on type 'never'". Casting once here (rather than fighting the
  // generated types) keeps the runtime behavior identical while giving
  // TypeScript a real shape to check against.
  const studentData = student as unknown as {
    id: string
    programme_id: string | null
    programmes: { name?: string } | null
  } | null

  // AUDIT FIX: everything below used to be hardcoded (87% attendance,
  // "RM 1,200", "Today 2pm", "3 published") regardless of who was signed in.
  // These are now real queries scoped to this student.

  const studentId = studentData?.id ?? null

  const [attendanceRes, invoicesRes, resultsRes, notificationsRes, enrollmentsRes] = await Promise.all([
    studentId ? supabase.from('attendance_records').select('status').eq('student_id', studentId) : Promise.resolve({ data: [] as { status: string }[] }),
    studentId
      ? supabase.from('fee_invoices')
          .select('id, amount, amount_paid, currency, status, due_date, institution_id')
          .eq('student_id', studentId)
          .in('status', ['sent', 'overdue'])
          .order('due_date', { ascending: true })
      : Promise.resolve({ data: [] as { id: string; amount: number; amount_paid: number; currency: string; status: string; due_date: string | null; institution_id: string }[] }),
    studentId
      ? supabase.from('exam_results').select('id, subject_id, grade, assessment_type, exam_date, subjects(name, code, credit_hours)').eq('student_id', studentId).eq('is_published', true)
      : Promise.resolve({ data: [] as { id: string; subject_id: string; grade: string | null; assessment_type: string | null; exam_date: string | null; subjects: { name: string; code: string | null; credit_hours: number | null } | null }[] }),
    // AUDIT FIX (build): this is the only unconditional (non-ternary-guarded)
    // query in this Promise.all — the ternary-guarded ones stay safe because
    // their `never` branch gets absorbed into the union with the typed
    // Promise.resolve fallback, but this one has no such fallback to absorb
    // into, so it must be cast after destructuring instead (see below).
    supabase.from('notifications').select('id, title, body, is_read, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
    studentId ? supabase.from('class_enrollments').select('class_id').eq('student_id', studentId).eq('is_active', true) : Promise.resolve({ data: [] as { class_id: string }[] }),
  ])

  const attendanceRows = attendanceRes.data ?? []
  const attendanceTotal = attendanceRows.length
  const attendancePresent = attendanceRows.filter(r => r.status === 'present' || r.status === 'late').length
  const attendancePct = attendanceTotal > 0 ? Math.round((attendancePresent / attendanceTotal) * 100) : null

  const invoices = invoicesRes.data ?? []
  const totalDue = invoices.reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.amount_paid)), 0)
  const nextInvoice = invoices[0]
  const feeCurrency = nextInvoice?.currency ?? 'USD'

  const examResultRows = (resultsRes.data ?? []) as unknown as Array<{
    id: string; subject_id: string; grade: string | null; assessment_type: string | null; exam_date: string | null
    subjects: { name: string; code: string | null; credit_hours: number | null } | null
  }>
  const resultsCount = examResultRows.length
  const cgpaResult = calculateCgpa(examResultRows.map(r => ({
    subjectId: r.subject_id,
    subjectName: r.subjects?.name ?? 'Subject',
    subjectCode: r.subjects?.code,
    creditHours: Number(r.subjects?.credit_hours ?? 0),
    grade: r.grade,
    assessmentType: r.assessment_type,
    examDate: r.exam_date,
  })))
  const notifications = (notificationsRes.data ?? []) as unknown as {
    id: string
    title: string
    body: string | null
    is_read: boolean
    created_at: string
  }[]

  const classIds = (enrollmentsRes.data ?? []).map(e => e.class_id)
  const nowIso = new Date().toISOString()
  const { data: upcomingClasses } = classIds.length
    ? await supabase
        .from('classes')
        .select('id, title, starts_at, class_type, subjects(name)')
        .in('id', classIds)
        .eq('is_cancelled', false)
        .gte('starts_at', nowIso)
        .order('starts_at', { ascending: true })
        .limit(5)
    : { data: [] as { id: string; title: string | null; starts_at: string; class_type: string; subjects: { name: string } | null }[] }

  const nextClass = upcomingClasses?.[0]

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-1">
        Welcome back, {profile?.full_name?.split(' ')[0]} 👋
      </h1>
      <p className="text-gray-500 text-sm mb-8">{studentData?.programmes?.name ?? ''}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        <StatCard label="CGPA" value={cgpaResult.cgpa !== null ? String(cgpaResult.cgpa) : 'In progress'} color="purple" />
        <StatCard label="Attendance" value={attendancePct !== null ? `${attendancePct}%` : 'No records yet'} color="blue" />
        <StatCard label="Fee Balance" value={totalDue > 0 ? formatMoney(totalDue, feeCurrency) : 'Paid up'} color="red" />
        <StatCard label="Next Class" value={nextClass ? formatClassTime(nextClass.starts_at) : 'None scheduled'} color="gold" />
        <StatCard label="Results" value={`${resultsCount} published`} color="green" />
      </div>

      <QuickAccessGrid userId={user!.id} initialTiles={orderedTiles} initialAccent={profile?.accent_color ?? 'blue'} />

      {nextInvoice && totalDue > 0 && (
        <div className="card mb-8">
          <p className="text-sm text-gray-600">
            You have an outstanding invoice of <span className="font-semibold">{formatMoney(Number(nextInvoice.amount) - Number(nextInvoice.amount_paid), feeCurrency)}</span>
            {nextInvoice.due_date ? ` due ${new Date(nextInvoice.due_date).toLocaleDateString()}` : ''}.
          </p>
          <PayNowButton
            invoiceId={nextInvoice.id}
            userId={user!.id}
            institutionId={nextInvoice.institution_id}
            amountDue={Number(nextInvoice.amount) - Number(nextInvoice.amount_paid)}
            currency={feeCurrency}
            description={`Invoice ${nextInvoice.id.slice(0, 8)}`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Upcoming Classes</h2>
          {upcomingClasses && upcomingClasses.length > 0 ? (
            <ul className="space-y-3">
              {upcomingClasses.map(c => (
                <li key={c.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{c.title || (c.subjects as unknown as { name?: string })?.name || 'Class'}</span>
                  <span className="text-gray-400">{formatClassTime(c.starts_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No upcoming classes scheduled.</p>
          )}
        </div>
        <div className="card">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Notifications</h2>
          {notifications.length > 0 ? (
            <ul className="space-y-3">
              {notifications.map(n => (
                <li key={n.id} className={n.is_read ? 'text-sm text-gray-500' : 'text-sm text-gray-800 font-medium'}>
                  {n.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No new notifications.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-brand-blue-100 text-brand-blue',
    red:  'bg-brand-red-100 text-brand-red',
    gold: 'bg-brand-gold-100 text-amber-700',
    green:'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
  }
  return (
    <div className="card">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-display font-bold ${colors[color]?.split(' ')[1]}`}>{value}</p>
    </div>
  )
}
