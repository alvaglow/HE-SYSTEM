'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AddStaffForm() {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'teacher' | 'staff' | 'admin' | 'management'>('teacher')
  const [position, setPosition] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { full_name: fullName, email, password, role, position: position || undefined },
    })
    setLoading(false)
    if (error) { setError(error.message ?? 'Failed to create account'); return }
    if (data?.error) { setError(data.error); return }
    setFullName(''); setEmail(''); setPassword(''); setPosition(''); setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Add Staff / Teacher
      </button>
    )
  }

  return (
    <div className="card">
      <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Add Staff or Teacher</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
          <input required value={fullName} onChange={e => setFullName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temporary password</label>
          <input type="text" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select value={role} onChange={e => setRole(e.target.value as typeof role)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
            <option value="teacher">Teacher</option>
            <option value="staff">Support Staff</option>
            <option value="management">Management</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {role !== 'teacher' && (
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Position (optional)</label>
            <input value={position} onChange={e => setPosition(e.target.value)}
              placeholder="e.g. Front Desk, Registrar"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
        )}
        {error && <p className="text-brand-red text-sm sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2 flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating…' : 'Create Account'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-brand-blue">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
