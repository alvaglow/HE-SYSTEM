'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ApplyButton({ institutionId, studentId, programmeId, totalCreditHours, cgpa }: {
  institutionId: string; studentId: string; programmeId: string; totalCreditHours: number; cgpa: number | null
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function apply() {
    setLoading(true)
    setError('')
    const { error: insertErr } = await supabase.from('graduation_applications').insert({
      institution_id: institutionId,
      student_id: studentId,
      programme_id: programmeId,
      total_credit_hours_completed: totalCreditHours,
      cgpa_at_application: cgpa,
    } as unknown as never)
    setLoading(false)
    if (insertErr) { setError(insertErr.message); return }
    router.refresh()
  }

  return (
    <div>
      <button onClick={apply} disabled={loading} className="btn-primary">
        {loading ? 'Submitting…' : 'Apply to Graduate'}
      </button>
      {error && <p className="text-brand-red text-xs mt-2">{error}</p>}
    </div>
  )
}
