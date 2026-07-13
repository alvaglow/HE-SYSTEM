import { createClient } from '@/lib/supabase/server'
import AddPartnerForm from './AddPartnerForm'

const TIER_STYLES: Record<string, string> = {
  platinum: 'bg-purple-50 text-purple-700',
  gold: 'bg-yellow-50 text-yellow-700',
  silver: 'bg-gray-100 text-gray-600',
  bronze: 'bg-orange-50 text-orange-700',
  starter: 'bg-blue-50 text-brand-blue',
}

export default async function AdminPartnersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: partnersRaw } = await supabase
    .from('partners')
    .select('id, company_name, referral_code, tier, total_recruited, total_earned, is_active, users(full_name, email)')
    .eq('institution_id', institutionId)
    .order('total_earned', { ascending: false })

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other admin page in this app.
  const partners = (partnersRaw ?? []) as unknown as Array<{
    id: string; company_name: string | null; referral_code: string; tier: string | null
    total_recruited: number | null; total_earned: number | null; is_active: boolean | null
    users: { full_name: string | null; email: string } | null
  }>

  const { data: recruitsRaw } = await supabase
    .from('partner_recruits')
    .select('id, student_name, student_email, status, tuition_fee, created_at, partners(company_name, users(full_name))')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false })
    .limit(50)

  const recruits = (recruitsRaw ?? []) as unknown as Array<{
    id: string; student_name: string | null; student_email: string | null
    status: string | null; tuition_fee: number | null; created_at: string
    partners: { company_name: string | null; users: { full_name: string | null } | null } | null
  }>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-brand-blue">Partners</h1>
      </div>

      <AddPartnerForm />

      <div className="card mt-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">
          All Partners ({partners.length})
        </h2>
        {partners.length === 0 ? (
          <p className="text-gray-400 text-sm">No partners yet. Add the first one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Referral code</th>
                  <th className="pb-2 font-medium">Tier</th>
                  <th className="pb-2 font-medium">Recruited</th>
                  <th className="pb-2 font-medium">Earned</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {partners.map(p => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{p.company_name || p.users?.full_name || '—'}</td>
                    <td className="py-2 text-gray-500 font-mono text-xs">{p.referral_code}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_STYLES[p.tier ?? 'starter'] ?? 'bg-gray-100 text-gray-500'}`}>
                        {(p.tier ?? 'starter').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{p.total_recruited ?? 0}</td>
                    <td className="py-2 text-gray-700">RM{Number(p.total_earned ?? 0).toLocaleString()}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card mt-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">
          Recent Recruits ({recruits.length})
        </h2>
        {recruits.length === 0 ? (
          <p className="text-gray-400 text-sm">No recruits recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Prospect</th>
                  <th className="pb-2 font-medium">Partner</th>
                  <th className="pb-2 font-medium">Tuition</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recruits.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{r.student_name ?? r.student_email ?? '—'}</td>
                    <td className="py-2 text-gray-500">{r.partners?.company_name || r.partners?.users?.full_name || '—'}</td>
                    <td className="py-2 text-gray-500">{r.tuition_fee != null ? `RM${Number(r.tuition_fee).toLocaleString()}` : '—'}</td>
                    <td className="py-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-blue-100 text-brand-blue">
                        {(r.status ?? 'prospect').toUpperCase()}
                      </span>
                    </td>
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
