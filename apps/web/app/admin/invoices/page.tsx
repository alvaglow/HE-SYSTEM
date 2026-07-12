import { createClient } from '@/lib/supabase/server'
import CreateInvoiceForm from './CreateInvoiceForm'

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-50 text-green-700',
  sent: 'bg-blue-50 text-brand-blue',
  overdue: 'bg-red-50 text-brand-red',
  draft: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-400',
}

export default async function AdminInvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''

  const { data: invoicesRaw } = await supabase
    .from('fee_invoices')
    .select('id, invoice_number, amount, amount_paid, currency, status, due_date, created_at, students(user_id, users(full_name))')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false })
    .limit(200)

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other admin page in this app.
  const invoices = (invoicesRaw ?? []) as unknown as Array<{
    id: string; invoice_number: string; amount: number; amount_paid: number | null
    currency: string | null; status: string | null; due_date: string | null; created_at: string
    students: { users: { full_name: string | null } | null } | null
  }>

  const { data: studentsRaw } = await supabase
    .from('students').select('id, users(full_name)').eq('institution_id', institutionId).eq('is_active', true)
  const students = ((studentsRaw ?? []) as unknown as Array<{ id: string; users: { full_name: string | null } | null }>)
    .map(s => ({ id: s.id, label: s.users?.full_name ?? 'Unnamed student' }))

  const { data: programmesRaw } = await supabase
    .from('programmes').select('id, name, fee_amount').eq('institution_id', institutionId).eq('is_active', true)
  const programmes = (programmesRaw ?? []) as unknown as Array<{ id: string; name: string; fee_amount: number | null }>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-brand-blue">Invoices</h1>
      </div>

      <CreateInvoiceForm institutionId={institutionId} students={students} programmes={programmes} />

      <div className="card mt-6">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">
          All Invoices ({invoices.length})
        </h2>
        {invoices.length === 0 ? (
          <p className="text-gray-400 text-sm">No invoices yet. Create the first one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Invoice #</th>
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Paid</th>
                  <th className="pb-2 font-medium">Due</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{inv.invoice_number}</td>
                    <td className="py-2 text-gray-500">{inv.students?.users?.full_name ?? '—'}</td>
                    <td className="py-2 text-gray-700">{Number(inv.amount).toLocaleString()} {inv.currency ?? 'MYR'}</td>
                    <td className="py-2 text-gray-500">{Number(inv.amount_paid ?? 0).toLocaleString()}</td>
                    <td className="py-2 text-gray-500">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[inv.status ?? 'draft'] ?? 'bg-gray-100 text-gray-500'}`}>
                        {(inv.status ?? 'draft').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
