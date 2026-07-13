'use client'
/**
 * AUDIT FIX: forgot-password's recovery email links here, but the page
 * didn't exist — /forgot-password was a dead end with no way to actually
 * set a new password. Supabase establishes a temporary recovery session
 * when the user follows the emailed link, so this page just calls
 * auth.updateUser({ password }) once mounted.
 *
 * Note: middleware.ts must treat /reset-password as accessible even though
 * the user now has a (recovery) session — otherwise its "already logged in,
 * redirect away from auth routes" logic would bounce them to their role
 * dashboard before they can set a new password.
 */
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => router.replace('/login'), 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-blue to-blue-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/HE-SYSTEM_Logo.svg" alt="HE-SYSTEM" className="h-14" />
        </div>
        <h1 className="text-2xl font-display font-bold text-brand-blue text-center mb-6">Set New Password</h1>
        {done ? (
          <p className="text-sm text-gray-600 text-center">Password updated. Redirecting to sign in…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            {error && <p className="text-brand-red text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
