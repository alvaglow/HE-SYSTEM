'use client'

type Exam = {
  id: string; exam_date: string; start_time: string; end_time: string; venue: string | null; notes: string | null
  subjects: { name: string } | null
}

// Builds a downloadable .ics (iCalendar) file client-side from the exam
// list — matches APSpace's "syncs exam timetable to your personal calendar"
// feature. No server round-trip needed: this is just RFC 5545 text.
function buildIcs(exams: Exam[]): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const toIcsDate = (date: string, time: string) => {
    const [y, m, d] = date.split('-').map(Number)
    const [hh, mm] = time.split(':').map(Number)
    return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`
  }
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HE-SYSTEM//Exam Timetable//EN']
  for (const e of exams) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:exam-${e.id}@he-system`,
      `DTSTART:${toIcsDate(e.exam_date, e.start_time)}`,
      `DTEND:${toIcsDate(e.exam_date, e.end_time)}`,
      `SUMMARY:${(e.subjects?.name ?? 'Exam')} — Exam`,
      `LOCATION:${e.venue ?? ''}`,
      `DESCRIPTION:${(e.notes ?? '').replace(/\n/g, '\\n')}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export default function ExamCalendarView({ exams }: { exams: Exam[] }) {
  function handleDownload() {
    const blob = new Blob([buildIcs(exams)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'exam-timetable.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={handleDownload} disabled={exams.length === 0} className="btn-primary text-sm">
          📅 Add to Calendar (.ics)
        </button>
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Upcoming Exams ({exams.length})</h2>
        {exams.length === 0 ? (
          <p className="text-gray-400 text-sm">No exams scheduled yet.</p>
        ) : (
          <ul className="space-y-3">
            {exams.map(e => (
              <li key={e.id} className="flex justify-between items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-gray-800">{e.subjects?.name ?? 'Exam'}</p>
                  <p className="text-sm text-gray-500">{e.venue ?? 'Venue TBA'}</p>
                  {e.notes && <p className="text-xs text-gray-400 mt-1">{e.notes}</p>}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm text-gray-700">{new Date(e.exam_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  <p className="text-xs text-gray-400">{e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
