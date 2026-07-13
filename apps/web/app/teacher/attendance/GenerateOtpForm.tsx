'use client'
import { useState } from 'react'
import { attendanceOtp } from '@/lib/edgeFunctions'

type ClassOption = { id: string; label: string }

export default function GenerateOtpForm({ classes }: { classes: ClassOption[] }) {
  const [classId, setClassId] = useState('')
  const [otp, setOtp] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setOtp('')
    try {
      const result = await attendanceOtp.generate(classId) as { otp?: string; expiresAt?: string; error?: string }
      if (result.error) { setError(result.error); return }
      setOtp(result.otp ?? '')
      setExpiresAt(result.expiresAt ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate OTP.')
    } finally {
      setLoading(false)
    }
  }

  if (classes.length === 0) {
    return <p className="text-gray-400 text-sm">No classes assigned to you yet.</p>
  }

  return (
    <div>
      <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-3">
        <select required value={classId} onChange={e => setClassId(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
          <option value="">— Select class —</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <button type="submit" disabled={loading} className="btn-primary whitespace-nowrap">
          {loading ? 'Generating…' : 'Generate OTP'}
        </button>
      </form>
      {error && <p className="text-brand-red text-sm mt-2">{error}</p>}
      {otp && (
        <div className="mt-4 p-4 bg-brand-blue-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Share this code with your class</p>
          <p className="text-3xl font-display font-bold text-brand-blue tracking-widest">{otp}</p>
          {expiresAt && <p className="text-xs text-gray-400 mt-1">Expires {new Date(expiresAt).toLocaleTimeString()}</p>}
        </div>
      )}
    </div>
  )
}
