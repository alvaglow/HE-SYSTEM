'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Option = { id: string; label: string }

export default function AddResultForm({ teacherId, institutionId, students, subjects }: { teacherId: string; institutionId: string; students: Option[]; subjects: Option[] }) {
  const [studentId, setStudentId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [assessmentName, setAssessmentName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [score, setScore] = useState('')
  const [maxScore, setMaxScore] = useState('100')
  const [grade, setGrade] = useState('')
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    let attachmentPath: string | null = null
    if (attachmentFile) {
      attachmentPath = `${institutionId}/exam-results/${crypto.randomUUID()}-${attachmentFile.name}`
      const { error: uploadErr } = await supabase.storage.from('exam-attachments').upload(attachmentPath, attachmentFile)
      if (uploadErr) { setLoading(false); setError(uploadErr.message); return }
    }

    // AUDIT FIX (build): this project's generated Database types collapse
    // insert()/update() payload types to `never` — cast once here, same
    // pattern used across every other portal form in this app. New results
    // default to is_published: false so students/parents can't see a grade
    // until the teacher explicitly publishes it.
    const { error } = await supabase.from('exam_results').insert({
      teacher_id: teacherId,
      student_id: studentId,
      subject_id: subjectId,
      assessment_name: assessmentName,
      exam_date: examDate || null,
      score: Number(score),
      max_score: Number(maxScore),
      grade: grade || null,
      attachment_url: attachmentPath,
      is_published: false,
    } as unknown as never)
    setLoading(false)
    if (error) { setError(error.message); return }
    setStudentId(''); setAssessmentName(''); setExamDate(''); setScore(''); setGrade(''); setAttachmentFile(null)
    router.refresh()
  }

  if (students.length === 0) {
    return <p className="text-gray-400 text-sm">No students enrolled in your classes yet.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <select required value={studentId} onChange={e => setStudentId(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
        <option value="">— Student —</option>
        {students.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <select required value={subjectId} onChange={e => setSubjectId(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
        <option value="">— Subject —</option>
        {subjects.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <input required value={assessmentName} onChange={e => setAssessmentName(e.target.value)} placeholder="Assessment name"
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <input type="number" required value={score} onChange={e => setScore(e.target.value)} placeholder="Score"
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <input type="number" required value={maxScore} onChange={e => setMaxScore(e.target.value)} placeholder="Max score"
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <input value={grade} onChange={e => setGrade(e.target.value)} placeholder="Grade (A/B/C/D/F)" maxLength={2}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <div className="sm:col-span-3">
        <label className="block text-xs text-gray-500 mb-1">Attachment (optional — scanned script, rubric, etc.)</label>
        <input type="file" accept="image/*,.pdf" onChange={e => setAttachmentFile(e.target.files?.[0] ?? null)} className="text-sm" />
      </div>
      {error && <p className="text-brand-red text-sm sm:col-span-3">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary sm:col-span-3">
        {loading ? 'Adding…' : 'Add Result (Draft)'}
      </button>
    </form>
  )
}
