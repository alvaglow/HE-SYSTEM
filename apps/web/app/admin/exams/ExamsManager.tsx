'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Exam = {
  id: string; exam_date: string; start_time: string; end_time: string; venue: string | null; notes: string | null
  subjects: { name: string } | null; programmes: { name: string } | null
}
type Option = { id: string; name: string }

export default function ExamsManager({
  institutionId, exams, subjects, programmes,
}: { institutionId: string; exams: Exam[]; subjects: Option[]; programmes: Option[] }) {
  const [open, setOpen] = useState(false)
  const [subjectId, setSubjectId] = useState('')
  const [programmeId, setProgrammeId] = useState('')
  const [examDate, setExamDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venue, setVenue] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.from('exam_timetable').insert({
      institution_id: institutionId,
      subject_id: subjectId || null,
      programme_id: programmeId || null,
      exam_date: examDate, start_time: startTime, end_time: endTime,
      venue: venue || null, notes: notes || null,
    } as unknown as never)
    setLoading(false)
    if (error) { setError(error.message); return }
    setSubjectId(''); setProgrammeId(''); setExamDate(''); setStartTime(''); setEndTime(''); setVenue(''); setNotes(''); setOpen(false)
    router.refresh()
  }

  async function remove(id: string) {
    await supabase.from('exam_timetable').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-primary mb-6">+ Schedule Exam</button>
      ) : (
        <div className="card mb-6">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">New Exam</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select required value={subjectId} onChange={e => setSubjectId(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Subject…</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={programmeId} onChange={e => setProgrammeId(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Programme (optional)…</option>
              {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input required type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} placeholder="Start" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} placeholder="End" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Venue (optional)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="border border-gray-200 rounded-lg px-3 py-2 text-sm sm:col-span-2" />
            {error && <p className="text-brand-red text-sm sm:col-span-2">{error}</p>}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Scheduling…' : 'Schedule Exam'}</button>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-brand-blue">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">All Exams ({exams.length})</h2>
        {exams.length === 0 ? (
          <p className="text-gray-400 text-sm">No exams scheduled yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Programme</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Venue</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {exams.map(e => (
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{e.subjects?.name ?? '—'}</td>
                    <td className="py-2 text-gray-500">{e.programmes?.name ?? 'All'}</td>
                    <td className="py-2 text-gray-500">{new Date(e.exam_date).toLocaleDateString()}</td>
                    <td className="py-2 text-gray-500">{e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}</td>
                    <td className="py-2 text-gray-500">{e.venue ?? '—'}</td>
                    <td className="py-2"><button onClick={() => remove(e.id)} className="text-xs text-brand-red hover:underline">Delete</button></td>
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
