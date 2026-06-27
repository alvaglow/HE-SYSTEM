import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true })
  const { count: teacherCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true })
  const { count: overdueCount } = await supabase.from('fee_invoices')
    .select('*', { count: 'exact', head: true }).eq('status', 'overdue')

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="card border-t-4 border-brand-blue">
          <p className="text-xs text-gray-500 mb-1">Total Students</p>
          <p className="text-3xl font-display font-bold text-brand-blue">{studentCount ?? '—'}</p>
        </div>
        <div className="card border-t-4 border-green-500">
          <p className="text-xs text-gray-500 mb-1">Teachers</p>
          <p className="text-3xl font-display font-bold text-green-600">{teacherCount ?? '—'}</p>
        </div>
        <div className="card border-t-4 border-brand-red">
          <p className="text-xs text-gray-500 mb-1">Overdue Invoices</p>
          <p className="text-3xl font-display font-bold text-brand-red">{overdueCount ?? '—'}</p>
        </div>
        <div className="card border-t-4 border-brand-gold">
          <p className="text-xs text-gray-500 mb-1">Pending Payouts</p>
          <p className="text-3xl font-display font-bold text-amber-600">—</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-display font-semibold text-brand-blue mb-4">Recent Enrolments</h2>
          <p className="text-gray-400 text-sm">No recent enrolments.</p>
        </div>
        <div className="card">
          <h2 className="font-display font-semibold text-brand-blue mb-4">Pending Actions</h2>
          <p className="text-gray-400 text-sm">Nothing pending.</p>
        </div>
      </div>
    </div>
  )
}
