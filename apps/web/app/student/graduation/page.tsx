import { createClient } from '@/lib/supabase/server'
import { calculateCgpa } from '@he-system/shared/utils/gpa-calculator'
import ApplyButton from './ApplyButton'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-brand-red/10 text-brand-red',
}

export default async function GraduationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: studentRaw } = await supabase.from('students').select('id, institution_id, programme_id, programmes(id, name, required_credit_hours)').eq('user_id', user!.id).single()
  const student = studentRaw as unknown as {
    id: string; institution_id: string; programme_id: string | null
    programmes: { id: string; name: string; required_credit_hours: number | null } | null
  } | null

  if (!student || !student.programme_id) {
    return (
      <div>
        <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Graduation Application</h1>
        <div className="card"><p className="text-gray-400 text-sm">No programme assigned to your record yet. Contact admin.</p></div>
      </div>
    )
  }

  const [{ data: resultsRaw }, { data: existingRaw }] = await Promise.all([
    supabase.from('exam_results').select('id, grade, assessment_type, exam_date, subject_id, subjects(name, code, credit_hours)').eq('student_id', student.id).eq('is_published', true),
    supabase.from('graduation_applications').select('id, status, total_credit_hours_completed, cgpa_at_application, applied_at, review_notes').eq('student_id', student.id).eq('programme_id', student.programme_id).maybeSingle(),
  ])

  const results = (resultsRaw ?? []) as unknown as Array<{
    id: string; grade: string | null; assessment_type: string | null; exam_date: string | null
    subject_id: string; subjects: { name: string; code: string | null; credit_hours: number | null } | null
  }>
  const cgpaResult = calculateCgpa(results.map(r => ({
    subjectId: r.subject_id, subjectName: r.subjects?.name ?? 'Subject', subjectCode: r.subjects?.code,
    creditHours: Number(r.subjects?.credit_hours ?? 0), grade: r.grade, assessmentType: r.assessment_type, examDate: r.exam_date,
  })))

  const existing = existingRaw as unknown as {
    id: string; status: string; total_credit_hours_completed: number; cgpa_at_application: number | null; applied_at: string; review_notes: string | null
  } | null

  const required = student.programmes?.required_credit_hours ?? null
  const eligible = required == null || cgpaResult.totalCreditHours >= required

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-2">Graduation Application</h1>
      <p className="text-sm text-gray-500 mb-8">{student.programmes?.name}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="card border-l-4 border-purple-400">
          <p className="text-xs text-gray-500 mb-1">CGPA</p>
          <p className="text-2xl font-display font-bold text-purple-700">{cgpaResult.cgpa ?? '—'}</p>
        </div>
        <div className="card border-l-4 border-brand-blue">
          <p className="text-xs text-gray-500 mb-1">Credit Hours Completed</p>
          <p className="text-2xl font-display font-bold text-brand-blue">{cgpaResult.totalCreditHours}</p>
        </div>
        <div className="card border-l-4 border-green-400">
          <p className="text-xs text-gray-500 mb-1">Required Credit Hours</p>
          <p className="text-2xl font-display font-bold text-green-700">{required ?? 'Not set'}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Degree Audit</h2>
        {required == null ? (
          <p className="text-gray-400 text-sm">Your programme doesn't have a required credit hour total configured yet — contact admin before applying.</p>
        ) : eligible ? (
          <p className="text-green-700 text-sm mb-4">You meet the minimum credit hour requirement for this programme.</p>
        ) : (
          <p className="text-yellow-700 text-sm mb-4">You need {(required - cgpaResult.totalCreditHours).toFixed(1)} more credit hours before you're eligible to apply.</p>
        )}

        {existing ? (
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[existing.status]}`}>{existing.status.toUpperCase()}</span>
              <span className="text-xs text-gray-400">Applied {new Date(existing.applied_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-gray-600">CGPA at application: {existing.cgpa_at_application ?? '—'} · Credits: {existing.total_credit_hours_completed}</p>
            {existing.review_notes && <p className="text-sm text-gray-500 mt-2"><strong>Reviewer notes:</strong> {existing.review_notes}</p>}
          </div>
        ) : eligible && required != null ? (
          <ApplyButton institutionId={student.institution_id} studentId={student.id} programmeId={student.programme_id} totalCreditHours={cgpaResult.totalCreditHours} cgpa={cgpaResult.cgpa} />
        ) : null}
      </div>
    </div>
  )
}
