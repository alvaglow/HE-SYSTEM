'use client'
import { useMemo, useState } from 'react'

type Resource = {
  id: string; title: string; description: string | null; url: string; category: string; resource_type: string; created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General', ebooks: 'E-Books', journals: 'Journals', 'past-papers': 'Past Papers', guides: 'Guides', software: 'Software',
}
const TYPE_ICONS: Record<string, string> = { link: '🔗', pdf: '📄', ebook: '📚', database: '🗄️' }

export default function LibraryBrowser({ resources }: { resources: Resource[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')

  const categories = useMemo(() => ['all', ...Array.from(new Set(resources.map(r => r.category)))], [resources])

  const filtered = resources.filter(r => {
    if (category !== 'all' && r.category !== category) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return r.title.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search resources…"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                category === c ? 'bg-brand-blue text-white' : 'bg-brand-blue-100 text-brand-blue hover:bg-brand-blue-200'
              }`}
            >
              {c === 'all' ? 'All' : (CATEGORY_LABELS[c] ?? c)}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-sm">No resources found.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(r => (
              <li key={r.id}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 border border-gray-100 rounded-xl p-4 hover:border-brand-blue hover:shadow-sm transition-all"
                >
                  <span className="text-2xl leading-none">{TYPE_ICONS[r.resource_type] ?? '🔗'}</span>
                  <div>
                    <p className="font-medium text-gray-800">{r.title}</p>
                    {r.description && <p className="text-sm text-gray-500 mt-1">{r.description}</p>}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-blue-100 text-brand-blue mt-2 inline-block">
                      {CATEGORY_LABELS[r.category] ?? r.category}
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
