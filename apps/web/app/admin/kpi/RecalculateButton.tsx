'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RecalculateButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleClick() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.functions.invoke('kpi-calculate', { body: {} })
    setLoading(false)
    if (error) { setError(error.message ?? 'Failed to recalculate KPIs'); return }
    if (data?.error) { setError(data.error); return }
    router.refresh()
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading} className="btn-primary">
        {loading ? 'Recalculating…' : 'Recalculate KPIs (last month)'}
      </button>
      {error && <p className="text-brand-red text-sm mt-2">{error}</p>}
    </div>
  )
}
