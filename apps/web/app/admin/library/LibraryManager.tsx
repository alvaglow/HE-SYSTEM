'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Resource = {
  id: string; title: string; description: string | null; url: string; category: string; resource_type: string
  is_published: boolean; created_at: string
}

const CATEGORIES = ['general', 'ebooks', 'journals', 'past-papers', 'guides', 'software']
const RESOURCE_TYPES = ['link', 'pdf', 'ebook', 'database']

export default function LibraryManager({
  institutionId, userId, resources,
}: { institutionId: string; userId: string; resources: Resource[] }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('general')
  const [resourceType, setResourceType] = useState('link')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.from('library_resources').insert({
      institution_id: institutionId,
      created_by: userId,
      title, description: description || null, url, category, resource_type: resourceType,
      is_published: true,
    } as unknown as never)
    setLoading(false)
    if (error) { setError(error.message); return }
    setTitle(''); setDescription(''); setUrl(''); setCategory('general'); setResourceType('link'); setOpen(false)
    router.refresh()
  }

  async function togglePublish(r: Resource) {
    await supabase.from('library_resources').update({ is_published: !r.is_published } as unknown as never).eq('id', r.id)
    router.refresh()
  }

  async function remove(id: string) {
    await supabase.from('library_resources').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-primary">+ Add Resource</button>
      ) : (
        <div className="card mb-6">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">New Library Resource</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Title"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm sm:col-span-2" />
            <input required type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm sm:col-span-2" />
            <select value={category} onChange={e => setCategory(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={resourceType} onChange={e => setResourceType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm sm:col-span-2" />
            {error && <p className="text-brand-red text-sm sm:col-span-2">{error}</p>}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding…' : 'Add Resource'}</button>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-brand-blue">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">All Resources ({resources.length})</h2>
        {resources.length === 0 ? (
          <p className="text-gray-400 text-sm">No library resources added yet.</p>
        ) : (
          <ul className="space-y-3">
            {resources.map(r => (
              <li key={r.id} className="flex justify-between items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-blue-100 text-brand-blue">{r.category}</span>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-800 hover:underline">{r.title}</a>
                  </div>
                  {r.description && <p className="text-sm text-gray-500 mt-1">{r.description}</p>}
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <button onClick={() => togglePublish(r)} className="text-xs text-brand-blue hover:underline">
                    {r.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => remove(r.id)} className="text-xs text-brand-red hover:underline">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
