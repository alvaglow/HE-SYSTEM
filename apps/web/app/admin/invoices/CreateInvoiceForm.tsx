'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Student = { id: string; label: string }
type Programme = { id: string; name: string; fee_amount: number | null }

export default function CreateInvoiceForm({
  institutionId, students, programmes,
}: { institutionId: string; students: Student[]; programmes: Programme[] }) {
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [programmeId, setProgrammeId] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function onProgrammeChange(id: string) {
    setProgrammeId(id)
    const prog = programmes.find(p => p.id === id)
    if (prog?.fee_amount != null) setAmount(String(prog.fee_amount))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    // Reuses the invoice-generate edge function (already handles staff auth,
    // invoice-number sequencing, and the student notification email).
    const { data, error } = await supabase.functions.invoke('invoice-generate', {
      body: {
        student_id: studentId,
        programme_id: programmeId,
        amount: parseFloat(amount),
        due_date: dueDate,
        description: description || undefined,
        institution_id: institutionId,
      },
    })
    setLoading(false)
    if (error) { setError(error.message ?? 'Failed to create invoice'); return }
    if (data?.error) { setError(data.error); return }
    setStudentId(''); setProgrammeId(''); setAmount(''); setDueDate(''); setDescription(''); setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Create Invoice
      </button>
    )
  }

  return (
    <div className="card">
      <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Create Invoice</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
          <select required value={studentId} onChange={e => setStudentId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
            <option value="">— Select —</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Programme</label>
          <select value={programmeId} onChange={e => onProgrammeChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
            <option value="">— None —</option>
            {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (RM)</label>
          <input type="number" step="0.01" min="0.01" required value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
          <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <input value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Tuition fee — 2026"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>
        {error && <p className="text-brand-red text-sm sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2 flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating…' : 'Create Invoice'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-brand-blue">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
