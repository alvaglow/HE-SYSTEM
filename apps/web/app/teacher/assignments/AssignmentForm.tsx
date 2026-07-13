'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ClassOption = { id: string; label: string; subjectId: string | null }

export default function AssignmentForm({ teacherId, institutionId, classes }: { teacherId: string; institutionId: string; classes: ClassOption[] }) {
  const [classId, setClassId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [maxScore, setMaxScore] = useState('100')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const cls = classes.find(c => c.id === classId)
    // AUDIT FIX (build): this project's generated Database types collapse
    // insert()/update() payload types to `never` — cast once here, same
    // pattern used across every other portal form in this app.
    const { error } = await supabase.from('assignments').insert({
      institution_id: institutionId,
      class_id: classId,
      subject_id: cls?.subjectId ?? null,
      teacher_id: teacherId,
      title,
      description: description || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      max_score: Number(maxScore),
    } as unknown as never)
    setLoading(false)
    if (error) { setError(error.message); return }
    setClassId(''); setTitle(''); setDescription(''); setDueAt(''); setMaxScore('100')
    router.refresh()
  }

  if (classes.length === 0) {
    return <p className="text-gray-400 text-sm">You don't have any classes yet.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <select required value={classId} onChange={e => setClassId(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue sm:col-span-2">
        <option value="">— Select class —</option>
        {classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Assignment title"
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue sm:col-span-2" />
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Instructions (optional)" rows={3}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue sm:col-span-2" />
      <div>
        <label className="block text-xs text-gray-500 mb-1">Due date (optional)</label>
        <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Max score</label>
        <input type="number" required value={maxScore} onChange={e => setMaxScore(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      </div>
      {error && <p className="text-brand-red text-sm sm:col-span-2">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary sm:col-span-2">
        {loading ? 'Creating…' : 'Create Assignment'}
      </button>
    </form>
  )
}
