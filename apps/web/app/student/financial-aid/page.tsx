import { createClient } from '@/lib/supabase/server'

const STATUS_STYLES: Record<string, string> = {
  applied: 'bg-blue-50 text-brand-blue', approved: 'bg-green-50 text-green-700',
  disbursed: 'bg-green-100 text-green-800', rejected: 'bg-red-50 text-brand-red',
}

export default async function StudentFinancialAidPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', user!.id).single()
  const studentId = (studentRaw as unknown as { id: string } | null)?.id ?? ''

  const { data: recordsRaw } = await supabase
    .from('financial_aid_records')
    .select('id, aid_type, provider, amount, currency, status, notes, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  const records = (recordsRaw ?? []) as unknown as Array<{
    id: string; aid_type: string; provider: string; amount: number | null; currency: string; status: string; notes: string | null; created_at: string
  }>

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-6">Scholarships & Financial Aid</h1>
      <div className="card">
        {records.length === 0 ? (
          <p className="text-gray-400 text-sm">No scholarship, loan, or grant records on file yet.</p>
        ) : (
          <ul className="space-y-4">
            {records.map(r => (
              <li key={r.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800 capitalize">{r.aid_type} — {r.provider}</p>
                    {r.amount && <p className="text-sm text-gray-500 mt-1">{Number(r.amount).toLocaleString()} {r.currency}</p>}
                    {r.notes && <p className="text-xs text-gray-400 mt-1">{r.notes}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {r.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
