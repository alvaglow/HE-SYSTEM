/**
 * AUDIT FIX: every role's sidebar nav (student/teacher/admin/management/
 * partner/parent layouts) links to a full set of feature pages — Attendance,
 * Timetable, Results, Fees, KPI, Invoices, Payouts, etc. — that never had a
 * page.tsx behind them. Clicking any of them 404'd. This is a shared,
 * honest placeholder so every nav link goes somewhere real instead of
 * Next.js's default 404, while making clear the feature isn't built yet
 * rather than pretending with fake data.
 */
export default function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-brand-blue mb-1">{title}</h1>
      <p className="text-gray-500 text-sm mb-8">{description ?? 'This section is not built yet.'}</p>
      <div className="card text-center py-16 text-gray-400">
        <p className="text-sm">Coming soon.</p>
      </div>
    </div>
  )
}
