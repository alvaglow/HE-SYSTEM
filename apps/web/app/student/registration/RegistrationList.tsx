'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ClassRow = {
  id: string; title: string | null; starts_at: string; capacity: number | null
  subjects: { name: string } | null; teachers: { users: { full_name: string | null } | null } | null
}
type EnrollmentRow = { id: string; class_id: string; is_active: boolean }

export default function RegistrationList({ studentId, classes, enrollments }: {
  studentId: string; classes: ClassRow[]; enrollments: EnrollmentRow[]
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()
  const supabase = createClient()

  const byClass = new Map(enrollments.map(e => [e.class_id, e]))

  async function handleEnroll(classId: string) {
    setBusyId(classId)
    setErrors(er => ({ ...er, [classId]: '' }))
    const existing = byClass.get(classId)
    // AUDIT FIX (build): this project's generated Database types collapse
    // insert()/update() payload types to `never` — cast once here, same
    // pattern used across every other portal form in this app.
    const { error } = existing
      ? await supabase.from('class_enrollments').update({ is_active: true } as unknown as never).eq('id', existing.id)
      : await supabase.from('class_enrollments').insert({ class_id: classId, student_id: studentId, is_active: true } as unknown as never)
    setBusyId(null)
    if (error) { setErrors(er => ({ ...er, [classId]: error.message })); return }
    router.refresh()
  }

  async function handleDrop(classId: string) {
    const existing = byClass.get(classId)
    if (!existing) return
    setBusyId(classId)
    const { error } = await supabase.from('class_enrollments').update({ is_active: false } as unknown as never).eq('id', existing.id)
    setBusyId(null)
    if (error) { setErrors(er => ({ ...er, [classId]: error.message })); return }
    router.refresh()
  }

  if (classes.length === 0) {
    return <p className="text-gray-400 text-sm">No classes open for registration right now.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="pb-2 font-medium">Class</th>
            <th className="pb-2 font-medium">Teacher</th>
            <th className="pb-2 font-medium">Starts</th>
            <th className="pb-2 font-medium">Capacity</th>
            <th className="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {classes.map(c => {
            const enrollment = byClass.get(c.id)
            const active = enrollment?.is_active ?? false
            return (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="py-2 text-gray-700">{c.title || c.subjects?.name || 'Class'}</td>
                <td className="py-2 text-gray-500">{c.teachers?.users?.full_name ?? '—'}</td>
                <td className="py-2 text-gray-500">{new Date(c.starts_at).toLocaleString()}</td>
                <td className="py-2 text-gray-500">{c.capacity ?? 'Unlimited'}</td>
                <td className="py-2">
                  {active ? (
                    <button onClick={() => handleDrop(c.id)} disabled={busyId === c.id} className="text-xs text-brand-red hover:underline">
                      {busyId === c.id ? 'Dropping…' : 'Drop'}
                    </button>
                  ) : (
                    <button onClick={() => handleEnroll(c.id)} disabled={busyId === c.id} className="text-xs text-brand-blue hover:underline">
                      {busyId === c.id ? 'Enrolling…' : 'Enroll'}
                    </button>
                  )}
                  {errors[c.id] && <p className="text-xs text-brand-red mt-1">{errors[c.id]}</p>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
