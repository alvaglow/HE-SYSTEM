'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Announcement = {
  id: string; title: string; body: string
  target_roles: string[] | null; is_published: boolean | null
  published_at: string | null; created_at: string
  category: string; event_date: string | null
}

const ALL_ROLES = ['student', 'teacher', 'admin', 'management', 'partner', 'parent']
const CATEGORIES = [
  { value: 'news', label: 'News', style: 'bg-blue-50 text-brand-blue' },
  { value: 'event', label: 'Event', style: 'bg-purple-50 text-purple-700' },
  { value: 'academic', label: 'Academic', style: 'bg-green-50 text-green-700' },
  { value: 'urgent', label: 'Urgent', style: 'bg-red-50 text-brand-red' },
]
const CATEGORY_STYLES: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.style]))

export default function AnnouncementsManager({
  institutionId, userId, announcements,
}: { institutionId: string; userId: string; announcements: Announcement[] }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('news')
  const [eventDate, setEventDate] = useState('')
  const [roles, setRoles] = useState<string[]>(ALL_ROLES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function toggleRole(r: string) {
    setRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    // AUDIT FIX (build): this project's generated Database types collapse
    // Supabase insert()/update() payload types to `never` (same issue seen
    // across every select() elsewhere in the app) — cast once here rather
    // than fighting the generated types.
    const { error } = await supabase.from('announcements').insert({
      institution_id: institutionId,
      created_by: userId,
      title, body,
      category,
      event_date: category === 'event' && eventDate ? new Date(eventDate).toISOString() : null,
      target_roles: roles,
      is_published: true,
      published_at: new Date().toISOString(),
    } as unknown as never)
    setLoading(false)
    if (error) { setError(error.message); return }
    setTitle(''); setBody(''); setCategory('news'); setEventDate(''); setRoles(ALL_ROLES); setOpen(false)
    router.refresh()
  }

  async function togglePublish(a: Announcement) {
    await supabase.from('announcements').update({
      is_published: !a.is_published,
      published_at: !a.is_published ? new Date().toISOString() : a.published_at,
    } as unknown as never).eq('id', a.id)
    router.refresh()
  }

  async function remove(id: string) {
    await supabase.from('announcements').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-primary">+ New Announcement</button>
      ) : (
        <div className="card mb-6">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">New Announcement</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input required value={title} onChange={e => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea required rows={4} value={body} onChange={e => setBody(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {CATEGORIES.map(c => (
                  <button type="button" key={c.value} onClick={() => setCategory(c.value)}
                    className={`text-xs px-3 py-1 rounded-full border ${category === c.value ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-gray-500 border-gray-200'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
              {category === 'event' && (
                <input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue mb-1" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visible to</label>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map(r => (
                  <button type="button" key={r} onClick={() => toggleRole(r)}
                    className={`text-xs px-3 py-1 rounded-full border ${roles.includes(r) ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-gray-500 border-gray-200'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-brand-red text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Publishing…' : 'Publish Announcement'}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-brand-blue">
                Cancel
              </button>
       