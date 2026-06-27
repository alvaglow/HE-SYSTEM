import { createClient } from '@/lib/supabase/server'

export default async function ParentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: links } = await supabase
    .from('parent_student_links')
    .select('*, students(*, users(full_name))')
    .eq('parent_user_id', user!.id)

  const children = links?.map(l => l.students) ?? []

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Parent Dashboard</h1>
      {children.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          No children linked to your account yet. Contact admin.
        </div>
      ) : (
        children.map((child: any) => (
          <div key={child.id} className="card mb-4">
            <h2 className="font-display font-semibold text-brand-blue text-lg">
              {child.users?.full_name}
            </h2>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-brand-blue">—%</p>
                <p className="text-xs text-gray-500">Attendance</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-brand-red">RM —</p>
                <p className="text-xs text-gray-500">Outstanding Fees</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">—</p>
                <p className="text-xs text-gray-500">Results</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
