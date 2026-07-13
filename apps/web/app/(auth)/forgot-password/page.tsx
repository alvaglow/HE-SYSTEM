'use client'
/**
 * AUDIT FIX: login.tsx already links to /forgot-password and middleware.ts
 * already whitelists it as an auth route, but the page didn't exist.
 * Sends Supabase's built-in password-recovery email, which links to
 * /reset-password (see that page for how the recovery session is handled).
 */
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-blue to-blue-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/HE-SYSTEM_Logo.svg" alt="HE-SYSTEM" className="h-14" />
        </div>
        <h1 className="text-2xl font-display font-bold text-brand-blue text-center mb-2">Reset Password</h1>
        {sent ? (
          <p className="text-sm text-gray-600 text-center mt-4">
            If an account exists for {email}, a reset link has been sent.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-500 text-center mb-6">
              Enter your email and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              {error && <p className="text-brand-red text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
        <Link href="/login" className="block text-center text-sm text-gray-500 mt-4 hover:text-brand-blue">
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}
