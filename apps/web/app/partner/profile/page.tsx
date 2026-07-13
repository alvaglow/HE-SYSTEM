import { createClient } from '@/lib/supabase/server'
import ProfileForm from './ProfileForm'

const TIER_STYLES: Record<string, string> = {
  platinum: 'bg-purple-50 text-purple-700',
  gold: 'bg-yellow-50 text-yellow-700',
  silver: 'bg-gray-100 text-gray-600',
  bronze: 'bg-orange-50 text-orange-700',
  starter: 'bg-blue-50 text-brand-blue',
}

export default async function PartnerProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: partnerRaw } = await supabase
    .from('partners')
    .select('id, company_name, bank_name, bank_account, bank_holder, tier, referral_code, total_recruited, total_earned, is_active')
    .eq('user_id', user!.id)
    .single()

  const partner = partnerRaw as unknown as {
    id: string; company_name: string | null; bank_name: string | null; bank_account: string | null; bank_holder: string | null
    tier: string | null; referral_code: string | null; total_recruited: number | null; total_earned: number | null; is_active: boolean
  } | null

  if (!partner) {
    return <div className="card text-center py-12 text-gray-400">Partner profile not found.</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Profile</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Tier</p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_STYLES[partner.tier ?? 'starter']}`}>
            {(partner.tier ?? 'starter').toUpperCase()}
          </span>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Referral Code</p>
          <p className="text-lg font-display font-bold text-brand-blue font-mono">{partner.referral_code ?? '—'}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Total Recruited</p>
          <p className="text-lg font-display font-bold text-gray-700">{partner.total_recruited ?? 0}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Edit Profile</h2>
        <p className="text-xs text-gray-400 mb-4">Tier, referral code, and earnings totals are managed by your institution and cannot be edited here.</p>
        <ProfileForm
          partnerId={partner.id}
          companyName={partner.company_name ?? ''}
          bankName={partner.bank_name ?? ''}
          bankAccount={partner.bank_account ?? ''}
          bankHolder={partner.bank_holder ?? ''}
        />
      </div>
    </div>
  )
}
