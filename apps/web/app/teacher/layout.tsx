import ErrorBoundary from '@/components/ErrorBoundary'
import PortalSidebar from '@/components/PortalSidebar'

const NAV_ITEMS: Array<[string, string]> = [
  ['Dashboard', '/teacher/dashboard'],
  ['KPI', '/teacher/kpi'],
  ['Attendance OTP', '/teacher/attendance'],
  ['Grades', '/teacher/grades'],
  ['Assignments', '/teacher/assignments'],
  ['Timetable', '/teacher/timetable'],
  ['Exam Timetable', '/teacher/exams'],
  ['Facility Finder', '/teacher/facilities'],
  ['Campus Shuttle', '/teacher/shuttle'],
  ['Room Booking', '/teacher/booking'],
  ['Support', '/teacher/support'],
  ['Students', '/teacher/students'],
  ['Leave', '/teacher/leave'],
  ['Messages', '/teacher/messages'],
  ['Announcements', '/teacher/announcements'],
]

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 dark:bg-gray-950">
      <PortalSidebar portalName="Teacher Portal" navItems={NAV_ITEMS} accent="blue" />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}
