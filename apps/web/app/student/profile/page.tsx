import { createClient } from '@/lib/supabase/server'

function formatDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
}

function daysUntil(d: string | null): number | null {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default async function StudentProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profileRaw } = await supabase.from('users').select('full_name, email, institution_id').eq('id', user!.id).single()
  const profile = profileRaw as unknown as { full_name: string | null; email: string; institution_id: string } | null

  const { data: studentRaw } = await supabase
    .from('students')
    .select('student_number, intake_date, expected_grad, nationality, passport_number, emgs_status, student_pass_expiry, programmes(name, code)')
    .eq('user_id', user!.id)
    .single()

  const student = studentRaw as unknown as {
    student_number: string | null; intake_date: string | null; expected_grad: string | null
    nationality: string | null; passport_number: string | null; emgs_status: string | null; student_pass_expiry: string | null
    programmes: { name: string; code: string | null } | null
  } | null

  const { data: institutionRaw } = profile?.institution_id
    ? await supabase.from('institutions').select('name').eq('id', profile.institution_id).single()
    : { data: null }
  const institution = institutionRaw as unknown as { name: string } | null

  const passExpiryDays = daysUntil(student?.student_pass_expiry ?? null)
  const passExpiringSoon = passExpiryDays !== null && passExpiryDays <= 60

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">My Profile</h1>

      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-16 h-16 rounded-full bg-brand-blue-100 text-brand-blue flex items-center justify-center text-2xl font-display font-bold">
            {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-display font-semibold text-gray-800">{profile?.full_name ?? '—'}</p>
            <p className="text-sm text-gray-500">{profile?.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Academic</h2>
          <dl className="space-y-3 text-sm">
            <Row label="Institution" value={institution?.name ?? '—'} />
            <Row label="Programme" value={student?.programmes?.name ? `${student.programmes.name}${student.programmes.code ? ` (${student.programmes.code})` : ''}` : '—'} />
            <Row label="Student ID" value={student?.student_number ?? '—'} />
            <Row label="Intake Date" value={formatDate(student?.intake_date ?? null)} />
            <Row label="Expected Graduation" value={formatDate(student?.expected_grad ?? null)} />
          </dl>
        </div>

        <div className="card">
          <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Personal & Immigration</h2>
          <dl className="space-y-3 text-sm">
            <Row label="Nationality" value={student?.nationality ?? '—'} />
            <Row label="Passport / IC Number" value={student?.passport_number ?? '—'} />
            <Row label="EMGS Status" value={student?.emgs_status ?? '—'} />
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Student Pass Expiry</dt>
              <dd className={`font-medium ${passExpiringSoon ? 'text-brand-red' : 'text-gray-700'}`}>
                {formatDate(student?.student_pass_expiry ?? null)}
                {passExpiringSoon && passExpiryDays !== null && (
                  <span className="block text-xs">
                    {passExpiryDays < 0 ? 'Expired' : `Expires in ${passExpiryDays} days`}
                  </span>
                )}
              </dd>
            </div>
          </dl>
          {passExpiringSoon && (
            <p className="text-xs text-brand-red mt-4 bg-red-50 rounded-lg p-3">
              Your student pass is expiring soon. Please contact the Admin office to arrange renewal.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-700 font-medium text-right">{value}</dd>
    </div>
  )
}
