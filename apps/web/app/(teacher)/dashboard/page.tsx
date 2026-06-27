import { createClient } from '@/lib/supabase/server'

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('full_name').eq('id', user!.id).single()

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-1">
        Teacher Dashboard
      </h1>
      <p className="text-gray-500 text-sm mb-8">Welcome, {profile?.full_name}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="card border-l-4 border-brand-blue">
          <p className="text-xs text-gray-500 mb-1">KPI Score</p>
          <p className="text-2xl font-display font-bold text-brand-blue">—</p>
        </div>
        <div className="card border-l-4 border-green-500">
          <p className="text-xs text-gray-500 mb-1">Classes Today</p>
          <p className="text-2xl font-display font-bold text-green-600">—</p>
        </div>
        <div className="card border-l-4 border-brand-gold">
          <p className="text-xs text-gray-500 mb-1">Pending Marking</p>
          <p className="text-2xl font-display font-bold text-amber-600">—</p>
        </div>
        <div className="card border-l-4 border-brand-red">
          <p className="text-xs text-gray-500 mb-1">At-Risk Students</p>
          <p className="text-2xl font-display font-bold text-brand-red">—</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Today&apos;s Classes</h2>
        <p className="text-gray-400 text-sm">Connect to Supabase to load your schedule.</p>
      </div>
    </div>
  )
}
