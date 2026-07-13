'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RequestLeaveForm({ userId, institutionId }: { userId: string; institutionId: string }) {
  const [leaveType, setLeaveType] = useState('sick')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (endDate < startDate) { setError('End date must be on or after start date.'); return }
    setLoading(true)
    // AUDIT FIX (build): this project's generated Database types collapse
    // insert()/update() payload types to `never` — cast once here, same
    // pattern used across every other portal form in this app. RLS forces
    // status to 'pending' on insert regardless of what's sent.
    const { error } = await supabase.from('leave_requests').insert({
      institution_id: institutionId,
      user_id: userId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason,
      status: 'pending',
    } as unknown as never)
    setLoading(false)
    if (error) { setError(error.message); return }
    setStartDate(''); setEndDate(''); setReason('')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <select value={leaveType} onChange={e => setLeaveType(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
        <option value="sick">Sick Leave</option>
        <option value="annual">Annual Leave</option>
        <option value="emergency">Emergency Leave</option>
        <option value="unpaid">Unpaid Leave</option>
        <option value="other">Other</option>
      </select>
      <div />
      <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Reason (optional)"
        className="sm:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      {error && <p className="text-brand-red text-sm sm:col-span-2">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary sm:col-span-2">
        {loading ? 'Submitting…' : 'Submit Request'}
      </button>
    </form>
  )
}
