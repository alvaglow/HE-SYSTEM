import { createClient } from '@/lib/supabase/server'
import FinancialAidManager from './FinancialAidManager'

export default async function AdminFinancialAidPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: recordsRaw } = await supabase
    .from('financial_aid_records')
    .select('id, aid_type, provider, amount, currency, status, notes, created_at, students(user_id, users(full_name))')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false })

  const records = (recordsRaw ?? []) as unknown as Array<{
    id: string; aid_type: string; provider: string; amount: number | null; currency: string; status: string; notes: string | null; created_at: string
    students: { users: { full_name: string | null } | null } | null
  }>

  const { data: studentsRaw } = await supabase
    .from('students').select('id, users(full_name)').eq('institution_id', institutionId).eq('is_active', true)
  const students = ((studentsRaw ?? []) as unknown as Array<{ id: string; users: { full_name: string | null } | null }>)
    .map(s => ({ id: s.id, label: s.users?.full_name ?? 'Unnamed student' }))

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-6">Scholarships & Financial Aid</h1>
      <FinancialAidManager institutionId={institutionId} records={records} students={students} />
    </div>
  )
}
