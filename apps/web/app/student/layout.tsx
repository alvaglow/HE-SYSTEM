import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ErrorBoundary from '@/components/ErrorBoundary'
import AiAssistantWidget from '@/components/AiAssistantWidget'
import PortalSidebar from '@/components/PortalSidebar'

const NAV_ITEMS: Array<[string, string]> = [
  ['Dashboard', '/student/dashboard'],
  ['Attendance', '/student/attendance'],
  ['Timetable', '/student/timetable'],
  ['Results', '/student/results'],
  ['Assignments', '/student/assignments'],
  ['Course Registration', '/student/registration'],
  ['Fees', '/student/fees'],
  ['Wallet', '/student/wallet'],
  ['Location', '/student/location'],
  ['Library', '/student/library'],
  ['Staff Directory', '/student/directory'],
  ['Messages', '/student/messages'],
  ['Announcements', '/student/announcements'],
  ['My Profile', '/student/profile'],
  ['Facility Finder', '/student/facilities'],
  ['Exam Timetable', '/student/exams'],
  ['Transcript', '/student/transcript'],
  ['Financial Aid', '/student/financial-aid'],
  ['Campus Shuttle', '/student/shuttle'],
  ['Room Booking', '/student/booking'],
  ['GPA Predictor', '/student/gpa-predictor'],
  ['Graduation', '/student/graduation'],
  ['Support', '/student/support'],
]

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 dark:bg-gray-950">
      <PortalSidebar portalName="Student Portal" navItems={NAV_ITEMS} accent="blue" />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8 print:ml-0">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <div className="no-print"><AiAssistantWidget /></div>
    </div>
  )
}
