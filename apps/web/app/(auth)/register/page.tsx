'use client'
/**
 * AUDIT FIX: middleware.ts and the login page both reference /register, but
 * the page didn't exist. Self-signup only makes sense for students and
 * partners here — admin/teacher/staff accounts are provisioned by an
 * institution admin — so this calls the auth-register edge function, which
 * enforces that role restriction and the institution lookup server-side
 * (the `users` table has no public INSERT policy, so this can't be done with
 * a direct client-side insert).
 */
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [institutionSlug, setInstitutionSlug] = useState('')
  const [role, setRole] = useState<'student' | 'partner'>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ needsConfirmation: boolean } | null>(null)
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.functions.invoke('auth-register', {
      body: {
        full_name: fullName,
        email,
        password,
        institution_slug: institutionSlug.trim().toLowerCase(),
        role,
      },
    })
    setLoading(false)
    if (error) { setError(error.message ?? 'Registration failed'); return }
    if (data?.error) { setError(data.error); return }
    setDone({ needsConfirmation: !!data?.needs_email_confirmation })
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-blue to-blue-900 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <h1 className="text-xl font-display font-bold text-brand-blue mb-3">Account created</h1>
          <p className="text-sm text-gray-600">
            {done.needsConfirmation
              ? 'Check your email to confirm your account before signing in.'
              : 'Your account is ready.'}
          </p>
          <Link href="/login" className="btn-primary inline-block mt-6">Go to Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-blue to-blue-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/HE-SYSTEM_Logo.svg" alt="HE-SYSTEM" className="h-14" />
        </div>
        <h1 className="text-2xl font-display font-bold text-brand-blue text-center mb-6">Create Account</h1>
        <form onSubmit={handleRegister} className="space-y-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institution code</label>
            <input required value={institutionSlug} onChange={e => setInstitutionSlug(e.target.value)}
              placeholder="e.g. happyenglish"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">I am a</label>
            <select value={role} onChange={e => setRole(e.target.value as 'student' | 'partner')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
              <option value="student">Student</option>
              <option value="partner">Recruitment Partner</option>
            </select>
          </div>
          {error && <p className="text-brand-red text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <Link href="/login" className="block text-center text-sm text-gray-500 mt-4 hover:text-brand-blue">
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  )
}
