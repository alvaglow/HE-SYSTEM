import { createClient } from '@/lib/supabase/server'

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${amount.toFixed(0)} ${currency}`
  }
}

export default async function ParentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: links } = await supabase
    .from('parent_student_links')
    .select('*, students(*, users(full_name))')
    .eq('parent_user_id', user!.id)

  const children = links?.map(l => l.students).filter(Boolean) ?? []

  // AUDIT FIX: every child card used to render "—%", "RM —", and "—" no
  // matter what the actual data said. Now each child's three stats are real,
  // per-student queries (same shape as the student dashboard's own numbers).
  const childStats = await Promise.all(
    children.map(async (child: any) => {
      const [{ data: attendance }, { data: invoices }, { count: resultsCount }] = await Promise.all([
        supabase.from('attendance_records').select('status').eq('student_id', child.id),
        supabase.from('fee_invoices').select('amount, amount_paid, currency').eq('student_id', child.id).in('status', ['sent', 'overdue']),
        supabase.from('exam_results').select('id', { count: 'exact', head: true }).eq('student_id', child.id).eq('is_published', true),
      ])

      const total = attendance?.length ?? 0
      const present = attendance?.filter((a: { status: string }) => a.status === 'present' || a.status === 'late').length ?? 0
      const attendancePct = total > 0 ? Math.round((present / total) * 100) : null

      const outstanding = (invoices ?? []).reduce((sum: number, inv: any) => sum + (Number(inv.amount) - Number(inv.amount_paid)), 0)
      const currency = invoices?.[0]?.currency ?? 'USD'

      return { attendancePct, outstanding, currency, resultsCount: resultsCount ?? 0 }
    })
  )

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Parent Dashboard</h1>
      {children.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          No children linked to your account yet. Contact admin.
        </div>
      ) : (
        children.map((child: any, i: number) => {
          const stats = childStats[i]
          return (
            <div key={child.id} className="card mb-4">
              <h2 className="font-display font-semibold text-brand-blue text-lg">
                {child.users?.full_name}
              </h2>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-brand-blue">{stats.attendancePct != null ? `${stats.attendancePct}%` : '—'}</p>
                  <p className="text-xs text-gray-500">Attendance</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-brand-red">{stats.outstanding > 0 ? formatMoney(stats.outstanding, stats.currency) : 'Paid up'}</p>
                  <p className="text-xs text-gray-500">Outstanding Fees</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.resultsCount}</p>
                  <p className="text-xs text-gray-500">Results</p>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
