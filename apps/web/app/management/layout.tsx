import ErrorBoundary from '@/components/ErrorBoundary'
import PortalSidebar from '@/components/PortalSidebar'

const NAV_ITEMS: Array<[string, string]> = [
  ['Dashboard', '/management/dashboard'],
  ['KPI Overview', '/management/kpi'],
  ['Finance', '/management/finance'],
  ['Partners', '/management/partners'],
  ['Payouts', '/management/payouts'],
  ['Enrolment', '/management/enrolment'],
  ['Leave', '/management/leave'],
  ['Reports', '/management/reports'],
  ['Library', '/management/library'],
  ['Rooms', '/management/rooms'],
  ['Exams', '/management/exams'],
  ['Financial Aid', '/management/financial-aid'],
  ['Shuttle', '/management/shuttle'],
  ['Audit Log', '/management/audit-log'],
  ['Support', '/management/support'],
  ['Room Bookings', '/management/bookings'],
  ['Graduation', '/management/graduation'],
]

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 dark:bg-gray-950">
      <PortalSidebar portalName="Leadership Portal" navItems={NAV_ITEMS} accent="black" />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}
