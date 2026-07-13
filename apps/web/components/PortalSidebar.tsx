'use client'
/**
 * Frontend refresh: every portal (admin/management/parent/partner/student/
 * teacher) used to hand-roll its own <aside> with an inline array-map of
 * links — six near-identical blocks of markup, no active-route highlighting,
 * and no responsive behavior (the fixed 240px sidebar just got covered by
 * page content on narrow viewports). This component replaces all six:
 * one place to fix nav UX, and it now collapses into a slide-out drawer
 * with a hamburger trigger below the `lg` breakpoint.
 */
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'

type NavItem = [label: string, href: string]

export default function PortalSidebar({
  portalName,
  navItems,
  accent = 'blue',
}: {
  portalName: string
  navItems: NavItem[]
  accent?: 'blue' | 'black'
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const bg = accent === 'black' ? 'bg-brand-black' : 'bg-brand-blue'

  const nav = (
    <nav className="flex-1 space-y-0.5 text-sm overflow-y-auto">
      {navItems.map(([label, href]) => {
        const active = pathname === href || pathname?.startsWith(href + '/')
        return (
          <a
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
              active
                ? 'bg-white/15 text-white font-medium shadow-nav'
                : 'text-white/75 hover:bg-white/10 hover:text-white'
            }`}
          >
            {label}
          </a>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Mobile top bar — only visible below lg, replaces the sidebar with a
          compact header + hamburger so page content gets full width on
          phones/small tablets instead of being squeezed next to a fixed
          240px rail. */}
      <div className={`no-print lg:hidden sticky top-0 z-30 ${bg} text-white flex items-center justify-between px-4 py-3`}>
        <div className="flex items-center gap-2">
          <img src="/HE-SYSTEM_Logo.svg" alt="HE-SYSTEM" className="h-7 brightness-0 invert" />
          <span className="text-xs text-white/60">{portalName}</span>
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle navigation"
          className="p-2 rounded-lg hover:bg-white/10"
        >
          <span className="block w-5 h-0.5 bg-white mb-1" />
          <span className="block w-5 h-0.5 bg-white mb-1" />
          <span className="block w-5 h-0.5 bg-white" />
        </button>
      </div>

      {open && (
        <div className="no-print lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)}>
          <aside
            className={`${bg} text-white w-64 h-full flex flex-col py-6 px-4`}
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6">
              <img src="/HE-SYSTEM_Logo.svg" alt="HE-SYSTEM" className="h-10 brightness-0 invert" />
              <span className="text-xs text-white/50 mt-1 block">{portalName}</span>
            </div>
            {nav}
            <LogoutButton />
          </aside>
        </div>
      )}

      {/* Desktop sidebar — fixed rail, unchanged position/width from before
          so nothing shifts for existing lg+ users, just restyled. */}
      <aside className={`no-print hidden lg:flex w-60 ${bg} text-white flex-col py-6 px-4 fixed h-full shadow-nav`}>
        <div className="mb-8">
          <img src="/HE-SYSTEM_Logo.svg" alt="HE-SYSTEM" className="h-10 brightness-0 invert" />
          <span className="text-xs text-white/50 mt-1 block">{portalName}</span>
        </div>
        {nav}
        <LogoutButton />
      </aside>
    </>
  )
}
