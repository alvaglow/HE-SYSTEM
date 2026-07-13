'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

// Client component so the filter form and pagination links work correctly
// regardless of which route renders this page (/admin/audit-log or
// /management/audit-log both re-export the same server page) — building
// URLs off the real current pathname instead of a hardcoded one.
export function AuditLogFilterForm({ action, resourceType, from, to }: {
  action: string; resourceType: string; from: string; to: string
}) {
  const [actionVal, setActionVal] = useState(action)
  const [resourceTypeVal, setResourceTypeVal] = useState(resourceType)
  const [fromVal, setFromVal] = useState(from)
  const [toVal, setToVal] = useState(to)
  const pathname = usePathname()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (actionVal) params.set('action', actionVal)
    if (resourceTypeVal) params.set('resource_type', resourceTypeVal)
    if (fromVal) params.set('from', fromVal)
    if (toVal) params.set('to', toVal)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-6 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Action contains</label>
        <input value={actionVal} onChange={e => setActionVal(e.target.value)} placeholder="e.g. payment"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Resource type</label>
        <input value={resourceTypeVal} onChange={e => setResourceTypeVal(e.target.value)} placeholder="e.g. fee_invoices"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">From</label>
        <input type="date" value={fromVal} onChange={e => setFromVal(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">To</label>
        <input type="date" value={toVal} onChange={e => setToVal(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
      </div>
      <button type="submit" className="btn-primary">Filter</button>
    </form>
  )
}

export function AuditLogPagination({ page, totalPages, action, resourceType, from, to }: {
  page: number; totalPages: number; action: string; resourceType: string; from: string; to: string
}) {
  const pathname = usePathname()
  const router = useRouter()

  function goTo(p: number) {
    const params = new URLSearchParams()
    if (action) params.set('action', action)
    if (resourceType) params.set('resource_type', resourceType)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    params.set('page', String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex justify-between items-center mt-4 text-sm">
      <button onClick={() => goTo(page - 1)} disabled={page <= 1} className="text-brand-blue hover:underline disabled:text-gray-300 disabled:no-underline">
        ← Previous
      </button>
      <button onClick={() => goTo(page + 1)} disabled={page >= totalPages} className="text-brand-blue hover:underline disabled:text-gray-300 disabled:no-underline">
        Next →
      </button>
    </div>
  )
}
