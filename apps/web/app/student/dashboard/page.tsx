import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PayNowButton from './PayNowButton'
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
  const { data: profileRaw } = await supabase.from('users').select('full_name, institution_id').eq('id', user!.id).single()
  // AUDIT FIX (build): plain (non-embedded-relation) selects can still
  // collapse to `never` under this project's generated Database types
  // (same issue as `studentData` below). Cast once here.
  const profile = profileRaw as unknown as { full_name: string | null; institution_id: string } | null
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

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-8">
        {QUICK_ACCESS.map(q => (
          <Link key={q.href} href={q.href} className="card flex flex-col items-center justify-center py-4 hover:shadow-md transition-shadow">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl mb-2 ${q.color}`}>{q.icon}</div>
            <span className="text-xs font-medium text-gray-700 text-center leading-tight">{q.label}</span>
          </Link>
        ))}
      </div>

      {nextInvoice && totalDue > 0 && (
        <div className="card mb-8">
          <p className="text-sm text-gray-600">
            You have an outstanding invoice of <span className="font-semibold">{formatMoney(Number(nextInvoice.amount) - Number(nextInvo