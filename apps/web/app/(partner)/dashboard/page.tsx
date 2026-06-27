import { createClient } from '@/lib/supabase/server'
import { getCommissionPct, getPartnerTier } from '@he-system/shared/utils/commission-formula'

export default async function PartnerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: partner } = await supabase
    .from('partners')
    .select('*, users(full_name)')
    .eq('user_id', user!.id)
    .single()

  const students = partner?.total_recruited ?? 0
  const pct = getCommissionPct(students)
  const tier = getPartnerTier(students)

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-1">Partner Dashboard</h1>
      <p className="text-gray-500 text-sm mb-8">
        {tier.emoji} {tier.label} — {pct}% commission rate
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="card border-l-4 border-brand-blue">
          <p className="text-xs text-gray-500 mb-1">Students Recruited</p>
          <p className="text-3xl font-display font-bold text-brand-blue">{students}</p>
        </div>
        <div className="card border-l-4 border-brand-gold">
          <p className="text-xs text-gray-500 mb-1">Commission Rate</p>
          <p className="text-3xl font-display font-bold text-amber-600">{pct}%</p>
        </div>
        <div className="card border-l-4 border-green-500">
          <p className="text-xs text-gray-500 mb-1">Total Earned</p>
          <p className="text-3xl font-display font-bold text-green-600">
            RM {(partner?.total_earned ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Tier progress bar */}
      <div className="card mb-6">
        <h2 className="font-display font-semibold text-brand-blue mb-3">Tier Progress</h2>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{tier.emoji} {tier.label}</span>
          <span>{students} students</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-gold rounded-full transition-all"
            style={{ width: `${Math.min(100, (students / (tier.maxStudents ?? students + 1)) * 100)}%` }}
          />
        </div>
        {tier.maxStudents && (
          <p className="text-xs text-gray-400 mt-2">
            {tier.maxStudents - students} more students to next tier
          </p>
        )}
      </div>

      <div className="card">
        <h2 className="font-display font-semibold text-brand-blue mb-3">Referral Link</h2>
        <div className="flex gap-2">
          <input
            readOnly
            value={`https://app.happyenglish.edu.vn/enrol?ref=${partner?.referral_code}`}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
          />
          <button className="btn-primary text-sm px-4">Copy</button>
        </div>
      </div>
    </div>
  )
}
