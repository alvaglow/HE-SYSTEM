'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { messageSend } from '@/lib/edgeFunctions'

type Recipient = { id: string; label: string }

export default function ComposeForm({ recipients, initialRecipientId }: { recipients: Recipient[]; initialRecipientId?: string }) {
  const [recipientId, setRecipientId] = useState(initialRecipientId ?? '')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    // Routed through the message-send edge function (not a direct insert) so
    // the recipient gets a real push/in-app notification of the new message.
    const result = await messageSend({ recipientId, content }).catch((err) => ({ error: err.message ?? 'Failed to send message' }))
    setLoading(false)
    if ('error' in result && result.error) { setError(result.error); return }
    setContent('')
    router.refresh()
  }

  if (recipients.length === 0) {
    return <p className="text-gray-400 text-sm">No teachers found for your enrolled classes yet.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <select required value={recipientId} onChange={e => setRecipientId(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
        <option value="">— Select recipient —</option>
        {recipients.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
      </select>
      <textarea required value={content} onChange={e => setContent(e.target.value)} rows={3}
        placeholder="Write a message…"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      {error && <p className="text-brand-red text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  )
}
