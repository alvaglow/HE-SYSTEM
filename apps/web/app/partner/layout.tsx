import ErrorBoundary from '@/components/ErrorBoundary'
import PortalSidebar from '@/components/PortalSidebar'

const NAV_ITEMS: Array<[string, string]> = [
  ['Dashboard', '/partner/dashboard'],
  ['My Students', '/partner/students'],
  ['Commission', '/partner/commission'],
  ['Payouts', '/partner/payouts'],
  ['Leaderboard', '/partner/leaderboard'],
  ['Profile', '/partner/profile'],
]

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 dark:bg-gray-950">
      <PortalSidebar portalName="Partner Portal" navItems={NAV_ITEMS} accent="blue" />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}
