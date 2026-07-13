'use client'
import { useMemo, useState } from 'react'
import { calculateCgpa, GRADE_OPTIONS } from '@he-system/shared/utils/gpa-calculator'

type CompletedSubject = { subjectId: string; subjectName: string; subjectCode?: string | null; creditHours: number; grade: string }

type HypRow = { id: string; name: string; creditHours: number; grade: string }

export default function Predictor({ completed, currentCgpa, totalCreditsCompleted }: {
  completed: CompletedSubject[]; currentCgpa: number | null; totalCreditsCompleted: number
}) {
  const [rows, setRows] = useState<HypRow[]>([{ id: crypto.randomUUID(), name: '', creditHours: 3, grade: 'A' }])

  function addRow() {
    setRows(r => [...r, { id: crypto.randomUUID(), name: '', creditHours: 3, grade: 'A' }])
  }
  function removeRow(id: string) {
    setRows(r => r.filter(row => row.id !== id))
  }
  function updateRow(id: string, patch: Partial<HypRow>) {
    setRows(r => r.map(row => row.id === id ? { ...row, ...patch } : row))
  }

  const projected = useMemo(() => {
    const inputs = [
      ...completed.map(c => ({
        subjectId: c.subjectId, subjectName: c.subjectName, subjectCode: c.subjectCode,
        creditHours: c.creditHours, grade: c.grade, assessmentType: 'final', examDate: '2000-01-01',
      })),
      ...rows.filter(r => r.name.trim() && r.creditHours > 0).map(r => ({
        subjectId: `hyp-${r.id}`, subjectName: r.name.trim(), creditHours: r.creditHours,
        grade: r.grade, assessmentType: 'final', examDate: '9999-01-01',
      })),
    ]
    return calculateCgpa(inputs)
  }, [completed, rows])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="card border-l-4 border-purple-400">
          <p className="text-xs text-gray-500 mb-1">Current CGPA</p>
          <p className="text-2xl font-display font-bold text-purple-700">{currentCgpa ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-1">{totalCreditsCompleted} credit hours completed</p>
        </div>
        <div className="card border-l-4 border-brand-blue">
          <p className="text-xs text-gray-500 mb-1">Projected CGPA</p>
          <p className="text-2xl font-display font-bold text-brand-blue">{projected.cgpa ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-1">{projected.totalCreditHours} credit hours (incl. hypothetical)</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Hypothetical Courses</h2>
        <div className="space-y-3">
          {rows.map(row => (
            <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_auto] gap-2 items-end">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Course name</label>
                <input value={row.name} onChange={e => updateRow(row.id, { name: e.target.value })} placeholder="e.g. Advanced Databases"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Credit hours</label>
                <input type="number" min={0} step={0.5} value={row.creditHours} onChange={e => updateRow(row.id, { creditHours: Number(e.target.value) })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Expected grade</label>
                <select value={row.grade} onChange={e => updateRow(row.id, { grade: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full">
                  {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <button onClick={() => removeRow(row.id)} className="text-xs px-3 py-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">Remove</button>
            </div>
          ))}
        </div>
        <button onClick={addRow} className="mt-4 text-sm px-4 py-2 rounded-lg bg-brand-blue text-white hover:opacity-90">+ Add Course</button>
        <p className="text-xs text-gray-400 mt-3">This is a simulation only — nothing here is saved or submitted. Add courses you expect to take and the grades you're aiming for to see the projected impact on your CGPA.</p>
      </div>
    </div>
  )
}
