'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Option = { id: string; label: string }

export default function EnrollForm({ students, classes }: { students: Option[]; classes: Option[] }) {
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [classId, setClassId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    // AUDIT FIX (build): this project's generated Database types collapse
    // insert()/update() payload types to `never` — cast once here, same
    // pattern used across every other admin form in this app.
    const { error } = await supabase.from('class_enrollments').insert({
      student_id: studentId,
      class_id: classId,
      is_active: true,
    } as unknown as never)
    setLoading(false)
    if (error) { setError(error.message); return }
    setStudentId(''); setClassId(''); setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Enrol Student
      </button>
    )
  }

  return (
    <div className="card">
      <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Enrol Student in Class</h2>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
          <select required value={classId} onChange={e => setClassId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
            <option value="">— Select —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        {error && <p className="text-brand-red text-sm sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2 flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Enrolling…' : 'Enrol Student'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-brand-blue">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
