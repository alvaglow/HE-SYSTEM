import { createClient } from '@/lib/supabase/server'
import ExportButton from './ExportButton'

export default async function ManagementReportsPage() {
  const supabase = await createClient()
  const now = new Date()

  const [
    { data: kpiRaw },
    { data: invoicesRaw },
    { data: expensesRaw },
    { data: partnersRaw },
  ] = await Promise.all([
    supabase.from('kpi_records').select('period_year, period_month, total_score, grade, users(full_name)').eq('period_year', now.getFullYear()).eq('period_month', now.getMonth() + 1),
    supabase.from('fee_invoices').select('invoice_number, amount, amount_paid, currency, status, due_date, students(users(full_name))').order('due_date', { ascending: false }).limit(500),
    supabase.from('expenses').select('description, category, amount, currency, status, expense_date, departments(name)').order('expense_date', { ascending: false }).limit(500),
    supabase.from('partners').select('company_name, tier, total_recruited, total_earned, is_active, users(full_name)'),
  ])

  const kpi = (kpiRaw ?? []) as unknown as Array<{ period_year: number; period_month: number; total_score: number | null; grade: string | null; users: { full_name: string | null } | null }>
  const invoices = (invoicesRaw ?? []) as unknown as Array<{ invoice_number: string; amount: number; amount_paid: number | null; currency: string; status: string | null; due_date: string | null; students: { users: { full_name: string | null } | null } | null }>
  const expenses = (expensesRaw ?? []) as unknown as Array<{ description: string; category: string | null; amount: number; currency: string; status: string | null; expense_date: string | null; departments: { name: string } | null }>
  const partners = (partnersRaw ?? []) as unknown as Array<{ company_name: string | null; tier: string | null; total_recruited: number | null; total_earned: number | null; is_active: boolean | null; users: { full_name: string | null } | null }>

  const kpiRows = kpi.map(r => ({ teacher: r.users?.full_name ?? '', period: `${r.period_year}-${String(r.period_month).padStart(2, '0')}`, score: r.total_score, grade: r.grade }))
  const invoiceRows = invoices.map(r => ({ invoice_number: r.invoice_number, student: r.students?.users?.full_name ?? '', amount: r.amount, paid: r.amount_paid, currency: r.currency, status: r.status, due_date: r.due_date }))
  const expenseRows = expenses.map(r => ({ department: r.departments?.name ?? '', category: r.category, description: r.description, amount: r.amount, currency: r.currency, status: r.status, date: r.expense_date }))
  const partnerRows = partners.map(r => ({ name: r.company_name || r.users?.full_name || '', tier: r.tier, recruited: r.total_recruited, earned: r.total_earned, active: r.is_active ? 'yes' : 'no' }))

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-gray-900 mb-8">Reports</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="card">
          <h2 className="font-display font-semibold text-gray-800 mb-1">KPI Summary — {now.toLocaleString('en-US', { month: 'long' })} {now.getFullYear()}</h2>
          <p className="text-gray-400 text-sm mb-4">Every staff/teacher KPI record calculated for the current period.</p>
          <ExportButton label="Download CSV" filename={`kpi-summary-${now.getFullYear()}-${now.getMonth() + 1}.csv`} rows={kpiRows} />
        </div>
        <div className="card">
          <h2 className="font-display font-semibold text-gray-800 mb-1">Invoices (last 500)</h2>
          <p className="text-gray-400 text-sm mb-4">Fee invoices with payment status, most recent due date first.</p>
          <ExportButton label="Download CSV" filename="invoices.csv" rows={invoiceRows} />
        </div>
        <div className="card">
          <h2 className="font-display font-semibold text-gray-800 mb-1">Expenses (last 500)</h2>
          <p className="text-gray-400 text-sm mb-4">Departmental expenses with approval status.</p>
          <ExportButton label="Download CSV" filename="expenses.csv" rows={expenseRows} />
        </div>
        <div className="card">
          <h2 className="font-display font-semibold text-gray-800 mb-1">Partner Performance</h2>
          <p className="text-gray-400 text-sm mb-4">Every partner, tier, recruitment count, and lifetime earnings.</p>
          <ExportButton label="Download CSV" filename="partners.csv" rows={partnerRows} />
        </div>
      </div>
    </div>
  )
}
