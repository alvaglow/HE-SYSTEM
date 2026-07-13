'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { attendanceOtp } from '@/lib/edgeFunctions'

export default function OtpCheckinForm({ studentId }: { studentId: string }) {
  const [classId, setClassId] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await attendanceOtp.validate(classId, studentId, otp)
      setSuccess('Checked in successfully.')
      setClassId('')
      setOtp('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input required value={classId} onChange={e => setClassId(e.target.value)}
        placeholder="Class ID"
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <input required value={otp} onChange={e => setOtp(e.target.value)}
        placeholder="6-digit OTP" maxLength={6}
        className="w-full sm:w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <button type="submit" disabled={loading} className="btn-primary whitespace-nowrap">
        {loading ? 'Checking in…' : 'Check In'}
      </button>
      {error && <p className="text-brand-red text-sm sm:ml-2 sm:self-center">{error}</p>}
      {success && <p className="text-green-600 text-sm sm:ml-2 sm:self-center">{success}</p>}
    </form>
  )
}
