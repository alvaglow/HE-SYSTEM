import ErrorBoundary from '@/components/ErrorBoundary'
import PortalSidebar from '@/components/PortalSidebar'

const NAV_ITEMS: Array<[string, string]> = [
  ['Dashboard', '/parent/dashboard'],
  ['Attendance', '/parent/attendance'],
  ['Results', '/parent/results'],
  ['Assignments', '/parent/assignments'],
  ['Exam Timetable', '/parent/exams'],
  ['Transcript', '/parent/transcript'],
  ['Financial Aid', '/parent/financial-aid'],
  ['Campus Shuttle', '/parent/shuttle'],
  ['Support', '/parent/support'],
  ['Fees', '/parent/fees'],
  ['Location', '/parent/location'],
  ['Messages', '/parent/messages'],
  ['Announcements', '/parent/announcements'],
]

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 dark:bg-gray-950">
      <PortalSidebar portalName="Parent Portal" navItems={NAV_ITEMS} accent="blue" />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}
