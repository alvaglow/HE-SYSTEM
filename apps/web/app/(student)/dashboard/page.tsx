import { createClient } from '@/lib/supabase/server'

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('full_name').eq('id', user!.id).single()
  const { data: student } = await supabase.from('students').select('*, programmes(name)').eq('user_id', user!.id).single()

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-1">
        Welcome back, {profile?.full_name?.split(' ')[0]} 👋
      </h1>
      <p className="text-gray-500 text-sm mb-8">{student?.programmes?.name}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard label="Attendance" value="87%" color="blue" />
        <StatCard label="Fee Balance" value="RM 1,200" color="red" />
        <StatCard label="Next Class" value="Today 2pm" color="gold" />
        <StatCard label="Results" value="3 published" color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Upcoming Classes</h2>
          <p className="text-gray-400 text-sm">Connect to Supabase to load your timetable.</p>
        </div>
        <div className="card">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Notifications</h2>
          <p className="text-gray-400 text-sm">No new notifications.</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-brand-blue-100 text-brand-blue',
    red:  'bg-brand-red-100 text-brand-red',
    gold: 'bg-brand-gold-100 text-amber-700',
    green:'bg-green-50 text-green-700',
  }
  return (
    <div className="card">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-display font-bold ${colors[color]?.split(' ')[1]}`}>{value}</p>
    </div>
  )
}
