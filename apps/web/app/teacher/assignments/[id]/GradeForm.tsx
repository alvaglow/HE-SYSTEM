'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function GradeForm({ submissionId, maxScore, initialScore, initialFeedback, teacherId }: {
  submissionId: string; maxScore: number; initialScore: number | null; initialFeedback: string | null; teacherId: string
}) {
  const [score, setScore] = useState(initialScore != null ? String(initialScore) : '')
  const [feedback, setFeedback] = useState(initialFeedback ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSave() {
    setLoading(true)
    setError('')
    // AUDIT FIX (build): this project's generated Database types collapse
    // update() payload types to `never` — cast once here, same pattern used
    // across every other portal form in this app.
    const { error } = await supabase.from('assignment_submissions').update({
      score: score === '' ? null : Number(score),
      feedback: feedback || null,
      graded_by: teacherId,
      graded_at: new Date().toISOString(),
    } as unknown as never).eq('id', submissionId)
    setLoading(false)
    if (error) { setError(error.message); return }
    router.refresh()
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mt-2">
      <input type="number" value={score} onChange={e => setScore(e.target.value)} placeholder={`Score / ${maxScore}`} min={0} max={maxScore}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <input value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Feedback (optional)"
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <button onClick={handleSave} disabled={loading} className="btn-primary text-xs px-3 py-1.5">
        {loading ? 'Saving…' : 'Save Grade'}
      </button>
      {error && <p className="text-brand-red text-xs">{error}</p>}
    </div>
  )
}
