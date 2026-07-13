import LogoutButton from '@/components/LogoutButton'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-60 bg-brand-black text-white flex flex-col py-6 px-4 fixed h-full">
        <div className="mb-8">
          <img src="/HE-SYSTEM_Logo.svg" alt="HE-SYSTEM" className="h-10 brightness-0 invert" />
          <span className="text-xs text-white/50 mt-1 block">Leadership Portal</span>
        </div>
        <nav className="flex-1 space-y-1 text-sm">
          {[
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
          ].map(([label, href]) => (
            <a key={href} href={href} className="flex items-center px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
              {label}
            </a>
          ))}
        </nav>
        <LogoutButton />
      </aside>
      <main className="ml-60 flex-1 p-8"><ErrorBoundary>{children}</ErrorBoundary></main>
    </div>
  )
}
