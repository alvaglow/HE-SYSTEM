import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const [
    { count: studentCount },
    { count: teacherCount },
    { count: overdueCount },
    { count: pendingPayouts },
    { data: recentStudents },
    { count: pendingExpenses },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('teachers').select('*', { count: 'exact', head: true }),
    supabase.from('fee_invoices').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    // AUDIT FIX: was hardcoded "—" — now counts payouts awaiting processing.
    supabase.from('partner_payouts').select('*', { count: 'exact', head: true }).eq('status', 'requested'),
    // AUDIT FIX: "Recent Enrolments" used to say "No recent enrolments" no
    // matter what was actually in the database.
    supabase.from('students').select('id, student_number, created_at, users(full_name)').order('created_at', { ascending: false }).limit(5),
    supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const pendingActionsCount = (pendingPayouts ?? 0) + (pendingExpenses ?? 0) + (overdueCount ?? 0)

  // AUDIT FIX: Supabase's generated types couldn't resolve the `users(full_name)`
  // embedded-resource shape on this query, which collapsed `recentStudents` to
  // `never[]` and broke the build with "Property 'id' does not exist on type
  // 'never'". Casting once here (rather than fighting the generated types)
  // keeps the runtime behavior identical while giving TypeScript a real shape
  // to check `.map()` against.
  const students = (recentStudents ?? []) as unknown as Array<{
    id: string
    student_number: string
    created_at: string
    users: { full_name?: string } | null
  }>

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
          <p className="text-3xl font-display font-bold text-amber-600">{pendingPayouts ?? '—'}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-display font-semibold text-brand-blue mb-4">Recent Enrolments</h2>
          {students.length > 0 ? (
            <ul className="space-y-3">
              {students.map(s => (
                <li key={s.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{s.users?.full_name ?? s.student_number}</span>
                  <span className="text-gray-400">{new Date(s.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No recent enrolments.</p>
          )}
        </div>
        <div className="card">
          <h2 className="font-display font-semibold text-brand-blue mb-4">Pending Actions</h2>
          {pendingActionsCount > 0 ? (
            <ul className="space-y-2 text-sm text-gray-700">
              {(overdueCount ?? 0) > 0 && <li>{overdueCount} overdue invoice{overdueCount === 1 ? '' : 's'} to follow up</li>}
              {(pendingPayouts ?? 0) > 0 && <li>{pendingPayouts} partner payout{pendingPayouts === 1 ? '' : 's'} awaiting processing</li>}
              {(pendingExpenses ?? 0) > 0 && <li>{pendingExpenses} expense{pendingExpenses === 1 ? '' : 's'} awaiting approval</li>}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">Nothing pending.</p>
          )}
        </div>
      </div>
    </div>
  )
}
