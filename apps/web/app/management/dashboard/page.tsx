import { createClient } from '@/lib/supabase/server'

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${amount.toFixed(0)} ${currency}`
  }
}

export default async function ManagementDashboard() {
  const supabase = await createClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: students },
    { count: partners },
    // AUDIT FIX: "Revenue (Month)" was hardcoded "RM —" — now sums this
    // month's fee_payments. Currency is mixed across gateways in a
    // multi-tenant system, so this totals per-currency rather than
    // pretending everything is one currency.
    { data: paymentsThisMonth },
    // AUDIT FIX: "Avg KPI Score" was hardcoded "— %" — now averages this
    // month's kpi_records.
    { data: kpiThisMonth },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('partners').select('*', { count: 'exact', head: true }),
    supabase.from('fee_payments').select('amount, invoice:fee_invoices(currency)').gte('paid_at', monthStart),
    supabase.from('kpi_records').select('total_score').eq('period_year', now.getFullYear()).eq('period_month', now.getMonth() + 1),
  ])

  // AUDIT FIX: Supabase's generated types couldn't resolve the
  // `invoice:fee_invoices(currency)` embedded-resource shape on this query,
  // which collapsed `paymentsThisMonth` to `never[]` and broke the build with
  // "Property 'amount'/'invoice' does not exist on type 'never'". Casting
  // once here (rather than fighting the generated types) keeps the runtime
  // behavior identical while giving TypeScript a real shape to check against.
  const payments = (paymentsThisMonth ?? []) as unknown as Array<{
    amount: number
    invoice: { currency?: string } | null
  }>

  const revenueByCurrency = new Map<string, number>()
  for (const p of payments) {
    const currency = p.invoice?.currency ?? 'USD'
    revenueByCurrency.set(currency, (revenueByCurrency.get(currency) ?? 0) + Number(p.amount))
  }
  const revenueLabel = revenueByCurrency.size > 0
    ? [...revenueByCurrency.entries()].map(([cur, amt]) => formatMoney(amt, cur)).join(' + ')
    : '—'

  // AUDIT FIX (build): same never-collapse issue as `paymentsThisMonth` above
  // — this query sits in the same Promise.all destructure, and TypeScript's
  // inference for the whole array collapsed this element too. Cast for the
  // same reason.
  const kpiRecords = (kpiThisMonth ?? []) as unknown as Array<{ total_score: number | null }>
  const kpiScores = kpiRecords.map(k => Number(k.total_score)).filter(n => !Number.isNaN(n))
  const avgKpi = kpiScores.length > 0 ? Math.round(kpiScores.reduce((a, b) => a + b, 0) / kpiScores.length) : null

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-gray-900 mb-8">Leadership Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="card border-t-4 border-brand-blue">
          <p className="text-xs text-gray-500 mb-1">Total Students</p>
          <p className="text-3xl font-display font-bold text-brand-blue">{students ?? '—'}</p>
        </div>
        <div className="card border-t-4 border-brand-gold">
          <p className="text-xs text-gray-500 mb-1">Active Partners</p>
          <p className="text-3xl font-display font-bold text-amber-600">{partners ?? '—'}</p>
        </div>
        <div className="card border-t-4 border-green-500">
          <p className="text-xs text-gray-500 mb-1">Revenue (Month)</p>
          <p className="text-3xl font-display font-bold text-green-600">{revenueLabel}</p>
        </div>
        <div className="card border-t-4 border-purple-500">
          <p className="text-xs text-gray-500 mb-1">Avg KPI Score</p>
          <p className="text-3xl font-display font-bold text-purple-600">{avgKpi != null ? `${avgKpi}%` : '—'}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-display font-semibold text-gray-800 mb-4">Revenue vs Target</h2>
          <p className="text-gray-400 text-sm">
            {revenueByCurrency.size > 0
              ? `This month so far: ${revenueLabel}. Set a target in budgets to compare against.`
              : 'No payments recorded yet this month.'}
          </p>
        </div>
        <div className="card">
          <h2 className="font-display font-semibold text-gray-800 mb-4">KPI Summary</h2>
          <p className="text-gray-400 text-sm">
            {kpiScores.length > 0
              ? `${kpiScores.length} staff/teacher KPI record${kpiScores.length === 1 ? '' : 's'} this month, averaging ${avgKpi}%.`
              : 'No KPI records calculated for this month yet.'}
          </p>
        </div>
      </div>
    </div>
  )
}
