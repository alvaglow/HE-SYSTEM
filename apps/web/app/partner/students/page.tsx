import { createClient } from '@/lib/supabase/server'

const STATUS_STYLES: Record<string, string> = {
  prospect: 'bg-gray-100 text-gray-600',
  applied: 'bg-yellow-50 text-yellow-700',
  enrolled: 'bg-green-50 text-green-700',
  dropped: 'bg-red-50 text-brand-red',
}

export default async function PartnerStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: partnerRaw } = await supabase.from('partners').select('id').eq('user_id', user!.id).single()
  const partner = partnerRaw as unknown as { id: string } | null
  const partnerId = partner?.id ?? ''

  const { data: recruitsRaw } = await supabase
    .from('partner_recruits')
    .select('id, student_name, student_email, status, tuition_fee, enrolled_at, created_at')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })

  const recruits = (recruitsRaw ?? []) as unknown as Array<{
    id: string; student_name: string | null; student_email: string | null; status: string | null
    tuition_fee: number | null; enrolled_at: string | null; created_at: string
  }>

  const counts = recruits.reduce((acc, r) => {
    const s = r.status ?? 'prospect'
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Recruited Students</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-8">
        {['prospect', 'applied', 'enrolled', 'dropped'].map(s => (
          <div key={s} className="card">
            <p className="text-xs text-gray-500 mb-1 capitalize">{s}</p>
            <p className="text-2xl font-display font-bold text-brand-blue">{counts[s] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Roster ({recruits.length})</h2>
        {recruits.length === 0 ? (
          <p className="text-gray-400 text-sm">No students recruited yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Tuition</th>
                  <th className="pb-2 font-medium">Referred</th>
                </tr>
              </thead>
              <tbody>
                {recruits.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{r.student_name ?? '—'}</td>
                    <td className="py-2 text-gray-500">{r.student_email ?? '—'}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status ?? 'prospect']}`}>
                        {(r.status ?? 'prospect').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{r.tuition_fee != null ? `RM${Number(r.tuition_fee).toLocaleString()}` : '—'}</td>
                    <td className="py-2 text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
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
