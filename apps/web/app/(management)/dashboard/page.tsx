import { createClient } from '@/lib/supabase/server'

export default async function ManagementDashboard() {
  const supabase = await createClient()
  const { count: students } = await supabase.from('students').select('*', { count: 'exact', head: true })
  const { count: partners } = await supabase.from('partners').select('*', { count: 'exact', head: true })

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
          <p className="text-3xl font-display font-bold text-green-600">RM —</p>
        </div>
        <div className="card border-t-4 border-purple-500">
          <p className="text-xs text-gray-500 mb-1">Avg KPI Score</p>
          <p className="text-3xl font-display font-bold text-purple-600">— %</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-display font-semibold text-gray-800 mb-4">Revenue vs Target</h2>
          <p className="text-gray-400 text-sm">Charts will load from live data.</p>
        </div>
        <div className="card">
          <h2 className="font-display font-semibold text-gray-800 mb-4">KPI Summary</h2>
          <p className="text-gray-400 text-sm">Connect supabase to see team scores.</p>
        </div>
      </div>
    </div>
  )
}
