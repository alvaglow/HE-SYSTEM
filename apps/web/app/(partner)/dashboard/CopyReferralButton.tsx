'use client'
/**
 * AUDIT FIX: the referral-link "Copy" button rendered on the (server
 * component) dashboard page had no onClick handler at all — clicking it did
 * nothing. Pulled into its own client component so it can actually write to
 * the clipboard.
 */
import { useState } from 'react'

export default function CopyReferralButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS) — fall back silently.
    }
  }

  return (
    <button onClick={handleCopy} className="btn-primary text-sm px-4">
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}
