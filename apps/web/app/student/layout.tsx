import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'
import ErrorBoundary from '@/components/ErrorBoundary'
import AiAssistantWidget from '@/components/AiAssistantWidget'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="no-print w-60 bg-brand-blue text-white flex flex-col py-6 px-4 fixed h-full">
        <div className="mb-8">
          <img src="/HE-SYSTEM_Logo.svg" alt="HE-SYSTEM" className="h-10 brightness-0 invert" />
        </div>
        <nav className="flex-1 space-y-1 text-sm">
          {[
            ['Dashboard', '/student/dashboard'],
            ['Attendance', '/student/attendance'],
            ['Timetable', '/student/timetable'],
            ['Results', '/student/results'],
            ['Assignments', '/student/assignments'],
            ['Course Registration', '/student/registration'],
            ['Fees', '/student/fees'],
            ['Wallet', '/student/wallet'],
            ['Location', '/student/location'],
            ['Library', '/student/library'],
            ['Staff Directory', '/student/directory'],
            ['Messages', '/student/messages'],
            ['Announcements', '/student/announcements'],
            ['My Profile', '/student/profile'],
            ['Facility Finder', '/student/facilities'],
            ['Exam Timetable', '/student/exams'],
            ['Transcript', '/student/transcript'],
            ['Financial Aid', '/student/financial-aid'],
            ['Campus Shuttle', '/student/shuttle'],
            ['Room Booking', '/student/booking'],
            ['GPA Predictor', '/student/gpa-predictor'],
            ['Graduation', '/student/graduation'],
            ['Support', '/student/support'],
          ].map(([label, href]) => (
            <a key={href} href={href}
              className="flex items-center px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
              {label}
            </a>
          ))}
        </nav>
        <LogoutButton />
      </aside>
      <main className="ml-60 flex-1 p-8 print:ml-0"><ErrorBoundary>{children}</ErrorBoundary></main>
      <div className="no-print"><AiAssistantWidget /></div>
    </div>
  )
}
