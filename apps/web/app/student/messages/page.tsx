import { createClient } from '@/lib/supabase/server'
import ComposeForm from './ComposeForm'

export default async function StudentMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''
  const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', user!.id).single()
  const student = studentRaw as unknown as { id: string } | null
  const studentId = student?.id ?? ''

  const [{ data: sentRaw }, { data: receivedRaw }, { data: enrollmentsRaw }] = await Promise.all([
    supabase.from('messages').select('id, content, created_at, is_read, recipient:recipient_id(full_name)').eq('sender_id', user!.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('messages').select('id, content, created_at, is_read, sender:sender_id(full_name)').eq('recipient_id', user!.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('class_enrollments').select('classes(teachers(user_id, users(full_name)))').eq('student_id', studentId),
  ])

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other portal page in this app.
  const sent = (sentRaw ?? []) as unknown as Array<{ id: string; content: string; created_at: string; is_read: boolean; recipient: { full_name: string | null } | null }>
  const received = (receivedRaw ?? []) as unknown as Array<{ id: string; content: string; created_at: string; is_read: boolean; sender: { full_name: string | null } | null }>

  const feed = [
    ...sent.map(m => ({ id: m.id, direction: 'sent' as const, other: m.recipient?.full_name ?? 'Unknown', content: m.content, created_at: m.created_at })),
    ...received.map(m => ({ id: m.id, direction: 'received' as const, other: m.sender?.full_name ?? 'Unknown', content: m.content, created_at: m.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 40)

  const enrollments = (enrollmentsRaw ?? []) as unknown as Array<{ classes: { teachers: { user_id: string; users: { full_name: string | null } | null } | null } | null }>
  const teacherMap = new Map<string, string>()
  for (const e of enrollments) {
    const t = e.classes?.teachers
    if (t?.user_id) teacherMap.set(t.user_id, t.users?.full_name ?? 'Teacher')
  }
  const recipients = [...teacherMap.entries()].map(([id, label]) => ({ id, label }))

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Messages</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">New Message</h2>
        <ComposeForm recipients={recipients} />
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Recent Conversations</h2>
        {feed.length === 0 ? (
          <p className="text-gray-400 text-sm">No messages yet.</p>
        ) : (
          <ul className="space-y-3">
            {feed.map(m => (
              <li key={`${m.direction}-${m.id}`} className="text-sm border-b border-gray-50 pb-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">{m.direction === 'sent' ? `You → ${m.other}` : `${m.other} → You`}</span>
                  <span className="text-xs text-gray-400">{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <p className="text-gray-600 mt-1">{m.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
