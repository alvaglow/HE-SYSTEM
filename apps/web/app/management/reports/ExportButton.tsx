'use client'

type Row = Record<string, string | number | null>

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))]
  return lines.join('\n')
}

export default function ExportButton({ label, filename, rows }: { label: string; filename: string; rows: Row[] }) {
  function download() {
    const csv = toCsv(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={download}
      disabled={rows.length === 0}
      className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {label} ({rows.length})
    </button>
  )
}
