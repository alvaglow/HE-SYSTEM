'use client'
import { useState } from 'react'
import { aiAssistant } from '@/lib/edgeFunctions'

type ChatMessage = { role: 'user' | 'assistant'; text: string }

// Original HE-SYSTEM assistant widget — inspired by the existence of an
// in-app assistant in other campus portals (e.g. APSpace's "AIDA"), but this
// is our own implementation: own name, own UI, own backend (see
// supabase/functions/ai-assistant). It only ever answers using the signed-in
// user's own data, fetched server-side.
export default function AiAssistantWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q) return
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setQuestion('')
    setLoading(true)
    setError('')
    try {
      const res = await aiAssistant(q)
      setMessages(prev => [...prev, { role: 'assistant', text: res.answer }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 w-80 sm:w-96 h-[28rem] bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="bg-brand-blue text-white px-4 py-3 flex items-center justify-between">
            <span className="font-display font-semibold text-sm">Campus Assistant</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-sm">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 px-2">
                Ask about your fees, attendance, CGPA, or next class.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`text-sm rounded-xl px-3 py-2 max-w-[85%] ${
                m.role === 'user' ? 'bg-brand-blue text-white ml-auto' : 'bg-gray-100 text-gray-800'
              }`}>
                {m.text}
              </div>
            ))}
            {loading && <div className="text-xs text-gray-400 px-2">Thinking…</div>}
            {error && <div className="text-xs text-brand-red px-2">{error}</div>}
          </div>
          <form onSubmit={handleAsk} className="border-t border-gray-100 p-2 flex gap-2">
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask a question…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <button type="submit" disabled={loading || !question.trim()} className="btn-primary text-sm px-3">Send</button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full bg-brand-blue text-white shadow-lg flex items-center justify-center text-2xl hover:bg-brand-blue-600 transition-colors"
        aria-label="Open campus assistant"
      >
        💬
      </button>
    </div>
  )
}
