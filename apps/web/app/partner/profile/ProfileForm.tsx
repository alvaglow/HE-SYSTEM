'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ProfileForm({
  partnerId, companyName, bankName, bankAccount, bankHolder,
}: { partnerId: string; companyName: string; bankName: string; bankAccount: string; bankHolder: string }) {
  const [form, setForm] = useState({ companyName, bankName, bankAccount, bankHolder })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(false)
    // AUDIT FIX (build): this project's generated Database types collapse
    // insert()/update() payload types to `never` — cast once here. Sensitive
    // fields (tier, totals, referral_code, is_active) are additionally
    // protected server-side by the partners_lock_sensitive_fields trigger,
    // so this UPDATE can only ever affect the editable columns below.
    const { error } = await supabase.from('partners').update({
      company_name: form.companyName,
      bank_name: form.bankName,
      bank_account: form.bankAccount,
      bank_holder: form.bankHolder,
    } as unknown as never).eq('id', partnerId)
    setLoading(false)
    if (error) { setError(error.message); return }
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Company Name</label>
        <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Bank Name</label>
        <input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Bank Account Number</label>
        <input value={form.bankAccount} onChange={e => setForm({ ...form, bankAccount: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Bank Account Holder</label>
        <input value={form.bankHolder} onChange={e => setForm({ ...form, bankHolder: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      </div>
      {error && <p className="text-brand-red text-sm">{error}</p>}
      {saved && <p className="text-green-600 text-sm">Saved.</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  )
}
