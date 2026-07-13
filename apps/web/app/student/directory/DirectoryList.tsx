'use client'
import { useState } from 'react'
import type { DirectoryEntry } from './page'

const ROLE_STYLES: Record<string, string> = {
  teacher: 'bg-blue-50 text-brand-blue',
  staff: 'bg-gray-100 text-gray-600',
}

export default function DirectoryList({ entries }: { entries: DirectoryEntry[] }) {
  const [query, setQuery] = useState('')

  const filtered = entries.filter(e => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return e.name.toLowerCase().includes(q) || (e.departmentName ?? '').toLowerCase().includes(q) || (e.detail ?? '').toLowerCase().includes(q)
  })

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by name, department, or specialization…"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-brand-blue"
      />
      {filtered.length === 0 ? (
        <p className="text-gray-400 text-sm">No matching staff or lecturers found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(e => (
            <div key={e.userId} className="card">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-brand-blue-100 text-brand-blue flex items-center justify-center font-display font-bold shrink-0">
                  {e.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{e.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_STYLES[e.role]}`}>{e.role === 'teacher' ? 'Lecturer' : 'Staff'}</span>
                </div>
              </div>
              {e.departmentName && <p className="text-xs text-gray-500 mb-1">{e.departmentName}</p>}
              {e.detail && <p className="text-xs text-gray-500 mb-3">{e.detail}</p>}
              <a
                href={`/student/messages?to=${e.userId}&name=${encodeURIComponent(e.name)}`}
                className="text-xs font-medium text-brand-blue hover:underline"
              >
                Message →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
