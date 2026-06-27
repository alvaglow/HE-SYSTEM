export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-60 bg-brand-blue text-white flex flex-col py-6 px-4 fixed h-full">
        <div className="mb-8">
          <img src="/HE-SYSTEM_Logo.svg" alt="HE-SYSTEM" className="h-10 brightness-0 invert" />
        </div>
        <nav className="flex-1 space-y-1 text-sm">
          {[
            ['Dashboard', '/partner/dashboard'],
            ['My Students', '/partner/students'],
            ['Commission', '/partner/commission'],
            ['Payouts', '/partner/payouts'],
            ['Leaderboard', '/partner/leaderboard'],
            ['Profile', '/partner/profile'],
          ].map(([label, href]) => (
            <a key={href} href={href} className="flex items-center px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="ml-60 flex-1 p-8">{children}</main>
    </div>
  )
}
