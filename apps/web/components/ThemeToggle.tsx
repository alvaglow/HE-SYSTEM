'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Batch 3 personalization: light/dark theme toggle. Applies the `dark`
// class to <html> immediately (Tailwind's `darkMode: 'class'` strategy),
// mirrors the choice to localStorage (so app/layout.tsx's inline script can
// apply it before hydration on the next visit, avoiding a flash), and
// persists it to `users.theme` so it follows the user across devices too.
export default function ThemeToggle({ userId, initialTheme }: { userId: string; initialTheme: 'light' | 'dark' }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme)
  const supabase = createClient()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  async function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try { localStorage.setItem('he-theme', next) } catch { /* ignore */ }
    await supabase.from('users').update({ theme: next } as unknown as never).eq('id', userId)
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
      <span>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
    </button>
  )
}
