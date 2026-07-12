'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Option = { id: string; label: string }

export default function AddClassForm({
  institutionId, subjects, teachers,
}: { institutionId: string; subjects: Option[]; teachers: Option[] }) {
  const [open, setOpen] = useState(false)
  const [subjectId, setSubjectId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [locationName, setLocationName] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [checkinMethod, setCheckinMethod] = useState('otp')
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
    const { error } = await supabase.from('classes').insert({
      institution_id: institutionId,
      subject_id: subjectId,
      teacher_id: teacherId,
      title: title || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      location_name: locationName || null,
      room_number: roomNumber || null,
      checkin_method: checkinMethod,
      class_type: 'campus',
    } as unknown as never)
    setLoading(false)
    if (error) { setError(error.message); return }
    setSubjectId(''); setTeacherId(''); setTitle(''); setStartsAt(''); setEndsAt('')
    setLocationName(''); setRoomNumber(''); setCheckinMethod('otp'); setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Schedule Class
      </button>
    )
  }

  return (
    <div className="card">
      <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Schedule Class</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select required value={subjectId} onChange={e => setSubjectId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
            <option value="">— Select —</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
          <select required value={teacherId} onChange={e => setTeacherId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
            <option value="">— Select —</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Class title (optional)</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Starts at</label>
          <input type="datetime-local" required value={startsAt} onChange={e => setStartsAt(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ends at</label>
          <input type="datetime-local" required value={endsAt} onChange={e => setEndsAt(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location name</label>
          <input value={locationName} onChange={e => setLocationName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Room number</label>
          <input value={roomNumber} onChange={e => setRoomNumber(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check-in method</label>
          <select value={checkinMethod} onChange={e => setCheckinMethod(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
            <option value="otp">OTP code</option>
            <option value="gps_biometric">GPS + biometric</option>
          </select>
        </div>
        {error && <p className="text-brand-red text-sm sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2 flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Scheduling…' : 'Schedule Class'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-brand-blue">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
