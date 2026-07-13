'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SubmitForm({ assignmentId, studentId, institutionId, existingId, initialContent }: {
  assignmentId: string; studentId: string; institutionId: string; existingId: string | null; initialContent: string | null
}) {
  const [content, setContent] = useState(initialContent ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    let filePath: string | null = null
    if (file) {
      filePath = `${institutionId}/assignment-submissions/${crypto.randomUUID()}-${file.name}`
      const { error: uploadErr } = await supabase.storage.from('assignment-submissions').upload(filePath, file)
      if (uploadErr) { setLoading(false); setError(uploadErr.message); return }
    }

    // AUDIT FIX (build): this project's generated Database types collapse
    // insert()/update() payload types to `never` — cast once here, same
    // pattern used across every other portal form in this app.
    const payload = {
      assignment_id: assignmentId,
      student_id: studentId,
      content: content || null,
      ...(filePath ? { file_path: filePath } : {}),
      submitted_at: new Date().toISOString(),
    }
    const { error } = existingId
      ? await supabase.from('assignment_submissions').update(payload as unknown as never).eq('id', existingId)
      : await supabase.from('assignment_submissions').insert(payload as unknown as never)
    setLoading(false)
    if (error) { setError(error.message); return }
    setFile(null)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your answer (optional if attaching a file)…" rows={3}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
      {error && <p className="text-brand-red text-xs">{error}</p>}
      <button type="submit" disabled={loading || (!content && !file)} className="btn-primary text-sm">
        {loading ? 'Submitting…' : existingId ? 'Resubmit' : 'Submit'}
      </button>
    </form>
  )
}
