'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Record_ = {
  id: string; aid_type: string; provider: string; amount: number | null; currency: string; status: string; notes: string | null
  students: { users: { full_name: string | null } | null } | null
}
type StudentOption = { id: string; label: string }

const AID_TYPES = ['scholarship', 'loan', 'grant', 'bursary']
const STATUSES = ['applied', 'approved', 'disbursed', 'rejected']
const STATUS_STYLES: Record<string, string> = {
  applied: 'bg-blue-50 text-brand-blue', approved: 'bg-green-50 text-green-700',
  disbursed: 'bg-green-100 text-green-800', rejected: 'bg-red-50 text-brand-red',
}

export default function FinancialAidManager({
  institutionId, records, students,
}: { institutionId: string; records: Record_[]; students: StudentOption[] }) {
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [aidType, setAidType] = useState('scholarship')
  const [provider, setProvider] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.from('financial_aid_records').insert({
      institution_id: institutionId, student_id: studentId, aid_type: aidType, provider,
      amount: amount ? Number(amount) : null, currency, status: 'applied', notes: notes || null,
    } as unknown as never)
    setLoading(false)
    if (error) { setError(error.message); return }
    setStudentId(''); setAidType('scholarship'); setProvider(''); setAmount(''); setNotes(''); setOpen(false)
    router.refresh()
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('financial_aid_records').update({ status } as unknown as never).eq('id', id)
    router.refresh()
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-primary mb-6">+ Add Record</button>
      ) : (
        <div className="card mb-6">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">New Financial Aid Record</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select required value={studentId} onChange={e => setStudentId(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm sm:col-span-2">
              <option value="">Student…</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select value={aidType} onChange={e => setAidType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {AID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input required value={provider} onChange={e => setProvider(e.target.value)} placeholder="Provider (e.g. PTPTN, Merit Scholarship)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (optional)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input value={currency} onChange={e => setCurrency(e.target.value)} placeholder="Currency"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm sm:col-span-2" />
            {error && <p className="text-brand-red text-sm sm:col-span-2">{error}</p>}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding…' : 'Add Record'}</button>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-brand-blue">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">All Records ({records.length})</h2>
        {records.length === 0 ? (
          <p className="text-gray-400 text-sm">No financial aid records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Provider</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{r.students?.users?.full_name ?? '—'}</td>
                    <td className="py-2 text-gray-500 capitalize">{r.aid_type}</td>
                    <td className="py-2 text-gray-500">{r.provider}</td>
                    <td className="py-2 text-gray-500">{r.amount ? `${Number(r.amount).toLocaleString()} ${r.currency}` : '—'}</td>
                    <td className="py-2">
                      <select
                        value={r.status}
                        onChange={e => updateStatus(r.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border-0 font-medium ${STATUS_STYLES[r.status] ?? 'bg-gray-100 text-gray-500'}`}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
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
