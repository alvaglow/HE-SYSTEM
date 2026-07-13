'use client'

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary text-sm">
      🖨️ Print / Save as PDF
    </button>
  )
}
