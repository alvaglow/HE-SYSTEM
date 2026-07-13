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
            ['Facility Finder', '/studen