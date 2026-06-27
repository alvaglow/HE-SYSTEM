import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-60 bg-brand-blue text-white flex flex-col py-6 px-4 fixed h-full">
        <div className="mb-8">
          <img src="/HE-SYSTEM_Logo.svg" alt="HE-SYSTEM" className="h-10 brightness-0 invert" />
        </div>
        <nav className="flex-1 space-y-1 text-sm">
          {[
            ['Dashboard', '/student/dashboard'],
            ['Attendance', '/student/attendance'],
            ['Timetable', '/student/timetable'],
            ['Results', '/student/results'],
            ['Fees', '/student/fees'],
            ['Wallet', '/student/wallet'],
            ['Location', '/student/location'],
            ['Messages', '/student/messages'],
          ].map(([label, href]) => (
            <a key={href} href={href}
              className="flex items-center px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
              {label}
            </a>
          ))}
        </nav>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-white/60 hover:text-white w-full text-left px-3 py-2">
            Log out
          </button>
        </form>
      </aside>
      <main className="ml-60 flex-1 p-8">{children}</main>
    </div>
  )
}
