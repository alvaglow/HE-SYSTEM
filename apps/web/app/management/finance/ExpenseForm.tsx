'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Department = { id: string; name: string }

export default function ExpenseForm({ institutionId, userId, departments }: { institutionId: string; userId: string; departments: Department[] }) {
  const [departmentId, setDepartmentId] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('MYR')
  const [expenseDate, setExpenseDate] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const amt = Number(amount)
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return }
    setLoading(true)

    let receiptPath: string | null = null
    if (receiptFile) {
      receiptPath = `${institutionId}/expenses/${crypto.randomUUID()}-${receiptFile.name}`
      const { error: uploadErr } = await supabase.storage.from('receipts').upload(receiptPath, receiptFile)
      if (uploadErr) { setLoading(false); setError(uploadErr.message); return }
    }

    // AUDIT FIX (build): this project's generated Database types collapse
    // insert()/update() payload types to `never` — cast once here, same
    // pattern used across every other portal form in this app.
    const { error: insertErr } = await supabase.from('expenses').insert({
      institution_id: institutionId,
      department_id: departmentId || null,
      submitted_by: userId,
      amount: amt,
      currency,
      category: category || null,
      description,
      expense_date: expenseDate || null,
      receipt_url: receiptPath,
      status: 'pending',
    } as unknown as never)

    setLoading(false)
    if (insertErr) { setError(insertErr.message); return }
    setDepartmentId(''); setCategory(''); setDescription(''); setAmount(''); setExpenseDate(''); setReceiptFile(null)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <select value={departmentId} onChange={e => setDepartmentId(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
        <option value="">— Department (optional) —</option>
        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Category (e.g. Travel, Supplies)"
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <input type="text" required value={description} onChange={e => setDescription(e.target.value)} placeholder="Description"
        className="sm:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <div className="flex gap-2">
        <input type="number" min="0.01" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        <select value={currency} onChange={e => setCurrency(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
          <option value="MYR">MYR</option>
          <option value="USD">USD</option>
          <option value="VND">VND</option>
        </select>
      </div>
      <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <div className="sm:col-span-2">
        <label className="block text-xs text-gray-500 mb-1">Receipt (optional)</label>
        <input type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] ?? null)} className="text-sm" />
      </div>
      {error && <p className="sm:col-span-2 text-brand-red text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary sm:col-span-2 justify-self-start">
        {loading ? 'Submitting…' : 'Submit Expense'}
      </button>
    </form>
  )
}
