import ErrorBoundary from '@/components/ErrorBoundary'
import PortalSidebar from '@/components/PortalSidebar'

const NAV_ITEMS: Array<[string, string]> = [
  ['Dashboard', '/admin/dashboard'],
  ['Students', '/admin/students'],
  ['Staff', '/admin/staff'],
  ['Enrolment', '/admin/enrolment'],
  ['Invoices', '/admin/invoices'],
  ['Partners', '/admin/partners'],
  ['Payouts', '/admin/payouts'],
  ['Leave', '/admin/leave'],
  ['Timetable', '/admin/timetable'],
  ['KPI', '/admin/kpi'],
  ['Announcements', '/admin/announcements'],
  ['Library', '/admin/library'],
  ['Rooms', '/admin/rooms'],
  ['Exams', '/admin/exams'],
  ['Financial Aid', '/admin/financial-aid'],
  ['Shuttle', '/admin/shuttle'],
  ['Audit Log', '/admin/audit-log'],
  ['Support', '/admin/support'],
  ['Room Bookings', '/admin/bookings'],
  ['Graduation', '/admin/graduation'],
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 dark:bg-gray-950">
      <PortalSidebar portalName="Admin Portal" navItems={NAV_ITEMS} accent="blue" />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}
