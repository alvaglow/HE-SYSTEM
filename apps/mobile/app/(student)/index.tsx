/**
 * Mirrors apps/web/app/student/dashboard (StudentDashboard).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, Card, StatCard, TileCard, TileGrid, LoadingView } from '../../components/ui'
import { calculateCgpa } from '@he-system/shared/utils/gpa-calculator'

type QuickTile = { key: string; icon: string; label: string; accent: string; route: string }

const DEFAULT_TILES: QuickTile[] = [
  { key: '/(student)/attendance', icon: '📅', label: 'Attendance', accent: colors.blue, route: '/(student)/attendance' },
  { key: '/(student)/timetable', icon: '🗓️', label: 'Timetable', accent: colors.blue, route: '/(student)/timetable' },
  { key: '/(student)/results', icon: '🎓', label: 'Results', accent: colors.green, route: '/(student)/results' },
  { key: '/(student)/assignments', icon: '✏️', label: 'Assignments', accent: colors.purple, route: '/(student)/assignments' },
  { key: '/(student)/registration', icon: '🗂️', label: 'Course Registration', accent: colors.blue, route: '/(student)/registration' },
  { key: '/(student)/fees', icon: '💳', label: 'Fees', accent: colors.red, route: '/(student)/fees' },
  { key: '/(student)/wallet', icon: '👛', label: 'Wallet', accent: colors.purple, route: '/(student)/wallet' },
  { key: '/(student)/location', icon: '📍', label: 'Location', accent: colors.purple, route: '/(student)/location' },
  { key: '/(student)/messages', icon: '💬', label: 'Messages', accent: colors.amber, route: '/(student)/messages' },
  { key: '/(student)/announcements', icon: '📰', label: 'News & Events', accent: colors.gray, route: '/(student)/announcements' },
  { key: '/(student)/library', icon: '📚', label: 'Library', accent: colors.blue, route: '/(student)/library' },
  { key: '/(student)/directory', icon: '🧑‍🏫', label: 'Staff Directory', accent: colors.green, route: '/(student)/directory' },
  { key: '/(student)/profile', icon: '🪪', label: 'My Profile', accent: colors.gray, route: '/(student)/profile' },
  { key: '/(student)/assistant', icon: '💬', label: 'Assistant', accent: colors.purple, route: '/(student)/assistant' },
  { key: '/(student)/facilities', icon: '🏫', label: 'Facility Finder', accent: colors.blue, route: '/(student)/facilities' },
  { key: '/(student)/exams', icon: '📝', label: 'Exam Timetable', accent: colors.red, route: '/(student)/exams' },
  { key: '/(student)/transcript', icon: '📜', label: 'Transcript', accent: colors.green, route: '/(student)/transcript' },
  { key: '/(student)/financial-aid', icon: '🎓', label: 'Financial Aid', accent: colors.amber, route: '/(student)/financial-aid' },
  { key: '/(student)/shuttle', icon: '🚌', label: 'Campus Shuttle', accent: colors.blue, route: '/(student)/shuttle' },
]

const ACCENT_OPTIONS: Record<string, string> = {
  blue: colors.blue, red: colors.red, green: colors.green, purple: colors.purple, amber: colors.amber, gray: colors.gray,
}

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

type Notification = { id: string; title: string; is_read: boolean }
type UpcomingClass = { id: string; title: string | null; starts_at: string; subjects: { name: string } | null }

export default function StudentDashboard() {
  const [firstName, setFirstName] = useState('')
  const [programme, setProgramme] = useState('')
  const [attendancePct, setAttendancePct] = useState<number | null>(null)
  const [totalDue, setTotalDue] = useState(0)
  const [feeCurrency, setFeeCurrency] = useState('USD')
  const [resultsCount, setResultsCount] = useState(0)
  const [cgpa, setCgpa] = useState<number | null>(null)
  const [nextClass, setNextClass] = useState<UpcomingClass | null>(null)
  const [upcoming, setUpcoming] = useState<UpcomingClass[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [tiles, setTiles] = useState<QuickTile[]>(DEFAULT_TILES)
  const [accentName, setAccentName] = useState('blue')
  const [editingTiles, setEditingTiles] = useState(false)
  const [savingTiles, setSavingTiles] = useState(false)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setFirstName((me.fullName ?? '').split(' ')[0] ?? '')
    setUserId(me.id)

    const { data: prefsRaw } = await supabase.from('users').select('accent_color, dashboard_tile_order').eq('id', me.id).single()
    const prefs = prefsRaw as unknown as { accent_color: string | null; dashboard_tile_order: string[] | null } | null
    setAccentName(prefs?.accent_color ?? 'blue')
    const order = prefs?.dashboard_tile_order
    if (order && order.length > 0) {
      const byKey = new Map(DEFAULT_TILES.map(t => [t.key, t]))
      const ordered = order.map(k => byKey.get(k)).filter((t): t is QuickTile => !!t)
      const missing = DEFAULT_TILES.filter(t => !order.includes(t.key))
      setTiles([...ordered, ...missing])
    } else {
      setTiles(DEFAULT_TILES)
    }

    const { data: student } = await supabase.from('students').select('id, programmes(name)').eq('user_id', me.id).single()
    const studentData = student as unknown as { id: string; programmes: { name?: string } | null } | null
    setProgramme(studentData?.programmes?.name ?? '')
    const studentId = studentData?.id ?? null

    const [attendanceRes, invoicesRes, resultsRes, notificationsRes, enrollmentsRes] = await Promise.all([
      studentId ? supabase.from('attendance_records').select('status').eq('student_id', studentId) : Promise.resolve({ data: [] as Array<{ status: string }> }),
      studentId ? supabase.from('fee_invoices').select('amount, amount_paid, currency').eq('student_id', studentId).in('status', ['sent', 'overdue']) : Promise.resolve({ data: [] as Array<{ amount: number; amount_paid: number; currency: string }> }),
      studentId
        ? supabase.from('exam_results').select('id, subject_id, grade, assessment_type, exam_date, subjects(name, code, credit_hours)').eq('student_id', studentId).eq('is_published', true)
        : Promise.resolve({ data: [] as Array<{ id: string; subject_id: string; grade: string | null; assessment_type: string | null; exam_date: string | null; subjects: { name: string; code: string | null; credit_hours: number | null } | null }> }),
      supabase.from('notifications').select('id, title, is_read').eq('user_id', me.id).order('created_at', { ascending: false }).limit(5),
      studentId ? supabase.from('class_enrollments').select('class_id').eq('student_id', studentId).eq('is_active', true) : Promise.resolve({ data: [] as Array<{ class_id: string }> }),
    ])

    const attendanceRows = (attendanceRes.data ?? []) as Array<{ status: string }>
    const total = attendanceRows.length
    const present = attendanceRows.filter(r => r.status === 'present' || r.status === 'late').length
    setAttendancePct(total > 0 ? Math.round((present / total) * 100) : null)

    const invoices = (invoicesRes.data ?? []) as Array<{ amount: number; amount_paid: number; currency: string }>
    setTotalDue(invoices.reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.amount_paid)), 0))
    setFeeCurrency(invoices[0]?.currency ?? 'USD')

    const examResultRows = (resultsRes.data ?? []) as unknown as Array<{
      id: string; subject_id: string; grade: string | null; assessment_type: string | null; exam_date: string | null
      subjects: { name: string; code: string | null; credit_hours: number | null } | null
    }>
    setResultsCount(examResultRows.length)
    setCgpa(calculateCgpa(examResultRows.map(r => ({
      subjectId: r.subject_id,
      subjectName: r.subjects?.name ?? 'Subject',
      subjectCode: r.subjects?.code,
      creditHours: Number(r.subjects?.credit_hours ?? 0),
      grade: r.grade,
      assessmentType: r.assessment_type,
      examDate: r.exam_date,
    }))).cgpa)
    setNotifications((notificationsRes.data ?? []) as unknown as Notification[])

    const classIds = ((enrollmentsRes.data ?? []) as Array<{ class_id: string }>).map(e => e.class_id)
    const nowIso = new Date().toISOString()
    const { data: upcomingClasses } = classIds.length
      ? await supabase.from('classes').select('id, title, starts_at, subjects(name)').in('id', classIds).eq('is_cancelled', false).gte('starts_at', nowIso).order('starts_at', { ascending: true }).limit(5)
      : { data: [] as UpcomingClass[] }

    const list = (upcomingClasses ?? []) as unknown as UpcomingClass[]
    setUpcoming(list)
    setNextClass(list[0] ?? null)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  as