import { createClient } from '@/lib/supabase/server'
import ReviewActions from './ReviewActions'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-brand-red/10 text-brand-red',
}

export default async function AdminGraduationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: appsRaw } = await supabase
    .from('graduation_applications')
    .select('id, status, total_credit_hours_completed, cgpa_at_application, applied_at, review_notes, students(student_number, users(full_name, email)), programmes(name, required_credit_hours)')
    .eq('institution_id', institutionId)
    .order('applied_at', { ascending: false })
    .limit(200)

  const apps = (appsRaw ?? []) as unknown as Array<{
    id: string; status: string; total_credit_hours_completed: number; cgpa_at_application: number | null; applied_at: string; review_notes: string | null
    students: { student_number: string; users: { full_name: string | null; email: string } | null } | null
    programmes: { name: string; required_credit_hours: number | null } | null
  }>

  const pending = apps.filter(a => a.status === 'pending')
  const decided = apps.filter(a => a.status !== 'pending')

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Graduation Applications</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Pending Review ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-gray-400 text-sm">No pending applications.</p>
        ) : (
          <div className="space-y-3">
            {pending.map(a => (
              <div key={a.id} className="border border-gray-100 rounded-lg p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">{a.students?.users?.full_name ?? '—'} ({a.students?.student_number})</p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.programmes?.name}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    CGPA: {a.cgpa_at_application ?? '—'} · Credits: {a.total_credit_hours_completed} / {a.programmes?.required_credit_hours ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Applied {new Date(a.applied_at).toLocaleDateString()}</p>
                </div>
                <ReviewActions applicationId={a.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Reviewed ({decided.length})</h2>
        {decided.length === 0 ? (
          <p className="text-gray-400 text-sm">No reviewed applications yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Programme</th>
                  <th className="pb-2 font-medium">Notes</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {decided.map(a => (
                  <tr key={a.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{a.students?.users?.full_name ?? '—'}</td>
                    <td className="py-2 text-gray-500">{a.programmes?.name}</td>
                    <td className="py-2 text-gray-500">{a.review_notes ?? '—'}</td>
                    <td className="py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[a.status]}`}>{a.status}</span></td>
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
