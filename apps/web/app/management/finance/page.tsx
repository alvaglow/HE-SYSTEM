import { createClient } from '@/lib/supabase/server'
import ExpenseForm from './ExpenseForm'

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${amount.toFixed(0)} ${currency}`
  }
}

export default async function ManagementFinancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()

  const [
    { data: paymentsMonthRaw },
    { data: paymentsYtdRaw },
    { data: outstandingRaw },
    { data: budgetsRaw },
    { data: expensesRaw },
    { data: departmentsRaw },
  ] = await Promise.all([
    supabase.from('fee_payments').select('amount, invoice:fee_invoices(currency)').gte('paid_at', monthStart),
    supabase.from('fee_payments').select('amount, invoice:fee_invoices(currency)').gte('paid_at', yearStart),
    supabase.from('fee_invoices').select('amount, amount_paid, currency').in('status', ['sent', 'overdue']),
    supabase.from('budgets').select('id, period_year, allocated, spent, departments(name)').eq('period_year', now.getFullYear()),
    supabase.from('expenses').select('id, amount, currency, category, description, status, expense_date, receipt_url, departments(name)').order('expense_date', { ascending: false }).limit(20),
    supabase.from('departments').select('id, name').eq('institution_id', institutionId).eq('is_active', true),
  ])

  const departments = (departmentsRaw ?? []) as unknown as Array<{ id: string; name: string }>

  const paymentsMonth = (paymentsMonthRaw ?? []) as unknown as Array<{ amount: number; invoice: { currency?: string } | null }>
  const paymentsYtd = (paymentsYtdRaw ?? []) as unknown as Array<{ amount: number; invoice: { currency?: string } | null }>
  const outstanding = (outstandingRaw ?? []) as unknown as Array<{ amount: number; amount_paid: number | null; currency: string }>
  const budgets = (budgetsRaw ?? []) as unknown as Array<{ id: string; period_year: number; allocated: number; spent: number | null; departments: { name: string } | null }>
  const expenses = (expensesRaw ?? []) as unknown as Array<{
    id: string; amount: number; currency: string; category: string | null; description: string
    status: string | null; expense_date: string | null; receipt_url: string | null; departments: { name: string } | null
  }>

  const receiptUrls = new Map<string, string>()
  await Promise.all(expenses.filter(e => e.receipt_url).map(async e => {
    const { data } = await supabase.storage.from('receipts').createSignedUrl(e.receipt_url!, 3600)
    if (data?.signedUrl) receiptUrls.set(e.id, data.signedUrl)
  }))

  function sumByCurrency(rows: Array<{ amount: number; invoice: { currency?: string } | null }>) {
    const map = new Map<string, number>()
    for (const r of rows) {
      const cur = r.invoice?.currency ?? 'USD'
      map.set(cur, (map.get(cur) ?? 0) + Number(r.amount))
    }
    return map
  }
  const monthMap = sumByCurrency(paymentsMonth)
  const ytdMap = sumByCurrency(paymentsYtd)
  const monthLabel = monthMap.size > 0 ? [...monthMap.entries()].map(([c, a]) => formatMoney(a, c)).join(' + ') : '—'
  const ytdLabel = ytdMap.size > 0 ? [...ytdMap.entries()].map(([c, a]) => formatMoney(a, c)).join(' + ') : '—'

  const outstandingByCurrency = new Map<string, number>()
  for (const inv of outstanding) {
    const remaining = Number(inv.amount) - Number(inv.amount_paid ?? 0)
    outstandingByCurrency.set(inv.currency, (outstandingByCurrency.get(inv.currency) ?? 0) + remaining)
  }
  const outstandingLabel = outstandingByCurrency.size > 0
    ? [...outstandingByCurrency.entries()].map(([c, a]) => formatMoney(a, c)).join(' + ')
    : '—'

  const EXPENSE_STATUS_STYLES: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700',
    approved: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-brand-red',
    paid: 'bg-blue-50 text-brand-blue',
  }

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-gray-900 mb-8">Finance Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="card border-t-4 border-green-500">
          <p className="text-xs text-gray-500 mb-1">Revenue (Month)</p>
          <p className="text-2xl font-display font-bold text-green-600">{monthLabel}</p>
        </div>
        <div className="card border-t-4 border-brand-blue">
          <p className="text-xs text-gray-500 mb-1">Revenue (YTD)</p>
          <p className="text-2xl font-display font-bold text-brand-blue">{ytdLabel}</p>
        </div>
        <div className="card border-t-4 border-brand-red">
          <p className="text-xs text-gray-500 mb-1">Outstanding Invoices</p>
          <p className="text-2xl font-display font-bold text-brand-red">{outstandingLabel}</p>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Budgets vs Spent ({now.getFullYear()})</h2>
        {budgets.length === 0 ? (
          <p className="text-gray-400 text-sm">No budgets set for this year yet.</p>
        ) : (
          <div className="space-y-3">
            {budgets.map(b => {
              const pct = b.allocated > 0 ? Math.min(100, Math.round((Number(b.spent ?? 0) / Number(b.allocated)) * 100)) : 0
              return (
                <div key={b.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{b.departments?.name ?? 'Department'}</span>
                    <span className="text-gray-500">{formatMoney(Number(b.spent ?? 0), 'MYR')} / {formatMoney(Number(b.allocated), 'MYR')}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${pct >= 100 ? 'bg-brand-red' : pct >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Submit Expense</h2>
        <ExpenseForm institutionId={institutionId} userId={user!.id} departments={departments} />
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Recent Expenses ({expenses.length})</h2>
        {expenses.length === 0 ? (
          <p className="text-gray-400 text-sm">No expenses recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Department</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{e.departments?.name ?? '—'}</td>
                    <td className="py-2 text-gray-500">{e.category ?? '—'}</td>
                    <td className="py-2 text-gray-500">{e.description}</td>
                    <td className="py-2 text-gray-700">{formatMoney(Number(e.amount), e.currency)}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${EXPENSE_STATUS_STYLES[e.status ?? 'pending'] ?? 'bg-gray-100 text-gray-500'}`}>
                        {(e.status ?? 'pending').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{e.expense_date ? new Date(e.expense_date).toLocaleDateString() : '—'}</td>
                    <td className="py-2 text-gray-500">
                      {receiptUrls.has(e.id) ? <a href={receiptUrls.get(e.id)} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline">View</a> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
      