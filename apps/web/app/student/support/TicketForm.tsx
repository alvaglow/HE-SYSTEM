'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  ['general', 'General'],
  ['it', 'IT / Technical'],
  ['academic', 'Academic'],
  ['financial', 'Financial'],
  ['facilities', 'Facilities'],
] as const

export default function TicketForm({ institutionId }: { institutionId: string }) {
  const [category, setCategory] = useState<string>('general')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim()) { setError('Subject is required.'); return }
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error: insertErr } = await supabase.from('support_tickets').insert({
      institution_id: institutionId,
      created_by: user!.id,
      category,
      subject: subject.trim(),
      description: description.trim() || null,
    } as unknown as never)
    setLoading(false)
    if (insertErr) { setError(insertErr.message); return }
    setSubject('')
    setDescription('')
    setCategory('general')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select value={category} onChange={e => setCategory(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </div>
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your issue…" rows={3}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      {error && <p className="text-brand-red text-xs">{error}</p>}
      <button type="submit" disabled={loading}
        className="text-sm px-4 py-2 rounded-lg bg-brand-blue text-white hover:opacity-90 disabled:opacity-50">
        {loading ? 'Submitting…' : 'Submit Ticket'}
      </button>
    </form>
  )
}
