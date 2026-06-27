import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-red-500 text-lg font-bold">
              HE
            </div>
            <span className="text-xl font-bold tracking-tight">HE-SYSTEM</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/api/health" className="text-sm text-slate-300 hover:text-white transition-colors">
              API Health
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl">
            Happy English
            <span className="mt-2 block bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
              Platform
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            Complete learning management and operations platform for educational institutions.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/student/dashboard"
              className="rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-500/40"
            >
              Student Portal
            </Link>
            <Link
              href="/teacher/dashboard"
              className="rounded-full bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-500"
            >
              Teacher Portal
            </Link>
            <Link
              href="/admin/dashboard"
              className="rounded-full bg-red-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition-all hover:bg剪刀 bg-red-500"
            >
              Admin Portal
            </Link>
          </div>
        </div>

        {/* Portal Grid */}
        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <PortalCard
            title="Student Portal"
            description="View attendance, results, invoices, and class schedule."
            href="/student/dashboard"
            color="bg-blue-600"
            icon="&#127891;"
          />
          <PortalCard
            title="Teacher Portal"
            description="Manage classes, KPI, marking, and student tracking."
            href="/teacher/dashboard"
            color="bg-emerald-600"
            icon="&#127979;"
          />
          <PortalCard
            title="Admin Portal"
            description="Student management, invoicing, and scheduling."
            href="/admin/dashboard"
            color="bg-red-600"
            icon="&#128295;"
          />
          <PortalCard
            title="Management"
            description="KPI overview, financials, and analytics dashboard."
            href="/management/dashboard"
            color="bg-purple-600"
            icon="&#128202;"
          />
          <PortalCard
            title="Partner Portal"
            description="Commission tracking, referral links, and tier progress."
            href="/partner/dashboard"
            color="bg-amber-600"
            icon="&#129309;"
          />
          <PortalCard
            title="Parent Portal"
            description="Multi-child view: attendance, results, and fees."
            href="/parent/dashboard"
            color="bg-cyan-600"
            icon="&#128106;"
          />
        </div>

        {/* Login Section */}
        <div className="mt-20 text-center">
          <div className="rounded-2xl bg-slate-800/50 p-8 backdrop-blur-sm border border-slate-700/50">
            <h2 className="text-2xl font-bold text-white">Already have an account?</h2>
            <p className="mt-2 text-slate-300">Login to access your dashboard.</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-full bg-white px-10 py-3 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-100 hover:shadow-lg"
            >
              Login to Dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-slate-400">
          <p> HE-SYSTEM — Happy English Platform. All rights reserved.</p>
          <p className="mt-2">
            <Link href="/api/health" className="text-slate-500 hover:text-slate-300 transition-colors">
              API Health Status
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}

function PortalCard({ title, description, href, color, icon }: { title: string; description: string; href: string; color: string; icon: string }) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl bg-slate-800/50 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-slate-800/70 hover:shadow-xl hover:shadow-slate-900/20 border border-slate-700/ renders"
    >
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${color} text-2xl shadow-lg`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
        {title}
      </h3>
      <p className="mt-2 text-sm text-slate-400 leading-relaxed">{description}</p>
      <div className="mt-4 flex items-center text-sm font-medium text-blue-400 group-hover:text-blue-300">
        Enter Portal
        <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
