'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Tile = { href: string; icon: string; label: string; color: string }

const ACCENTS: Record<string, { swatch: string; text: string; border: string }> = {
  blue: { swatch: 'bg-brand-blue', text: 'text-brand-blue', border: 'border-brand-blue' },
  red: { swatch: 'bg-brand-red', text: 'text-brand-red', border: 'border-brand-red' },
  green: { swatch: 'bg-green-600', text: 'text-green-700', border: 'border-green-600' },
  purple: { swatch: 'bg-purple-600', text: 'text-purple-700', border: 'border-purple-600' },
  amber: { swatch: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-500' },
  gray: { swatch: 'bg-gray-600', text: 'text-gray-700', border: 'border-gray-600' },
}

export default function QuickAccessGrid({
  userId, initialTiles, initialAccent,
}: { userId: string; initialTiles: Tile[]; initialAccent: string }) {
  const [tiles, setTiles] = useState(initialTiles)
  const [accent, setAccent] = useState(initialAccent)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const accentStyle = ACCENTS[accent] ?? ACCENTS.blue

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= tiles.length) return
    const next = [...tiles]
    ;[next[index], next[target]] = [next[target], next[index]]
    setTiles(next)
  }

  async function save() {
    setSaving(true)
    await supabase.from('users').update({
      accent_color: accent,
      dashboard_tile_order: tiles.map(t => t.href),
    } as unknown as never).eq('id', userId)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-sm font-display font-semibold ${accentStyle.text}`}>Quick Access</h2>
        <button onClick={() => setEditing(e => !e)} className="text-xs text-gray-500 hover:text-brand-blue">
          {editing ? 'Done' : 'Customize'}
        </button>
      </div>

      {editing && (
        <div className={`card mb-4 border-2 ${accentStyle.border}`}>
          <p className="text-xs font-medium text-gray-500 mb-2">Accent Color</p>
          <div className="flex gap-2 mb-4">
            {Object.entries(ACCENTS).map(([name, s]) => (
              <button
                key={name}
                onClick={() => setAccent(name)}
                className={`w-7 h-7 rounded-full ${s.swatch} ${accent === name ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                aria-label={name}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-gray-500 mb-2">Reorder Tiles</p>
          <ul className="space-y-1 mb-4">
            {tiles.map((t, i) => (
              <li key={t.href} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-1.5">
                <span>{t.icon} {t.label}</span>
                <div className="flex gap-2">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-brand-blue disabled:opacity-30">▲</button>
                  <button onClick={() => move(i, 1)} disabled={i === tiles.length - 1} className="text-gray-400 hover:text-brand-blue disabled:opacity-30">▼</button>
                </div>
              </li>
            ))}
          </ul>
          <button onClick={save} disabled={saving} className="btn-primary text-sm">{saving ? 'Saving…' : 'Save Preferences'}</button>
        </div>
      )}

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
        {tiles.map(q => (
          <Link key={q.href} href={q.href} className="card flex flex-col items-center justify-center py-4 hover:shadow-md transition-shadow">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl mb-2 ${q.color}`}>{q.icon}</div>
            <span className="text-xs font-medium text-gray-700 text-center leading-tight">{q.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
