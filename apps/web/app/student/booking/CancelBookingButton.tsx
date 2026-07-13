'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function cancel() {
    setLoading(true)
    await supabase.from('room_bookings').update({ status: 'cancelled' } as unknown as never).eq('id', bookingId)
    setLoading(false)
    router.refresh()
  }

  return (
    <button onClick={cancel} disabled={loading} className="text-xs px-3 py-1.5 rounded-lg bg-brand-red text-white hover:opacity-90 disabled:opacity-50">
      {loading ? 'Cancelling…' : 'Cancel'}
    </button>
  )
}
