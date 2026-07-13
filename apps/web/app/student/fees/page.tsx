import { createClient } from '@/lib/supabase/server'
import PayNowButton from '../dashboard/PayNowButton'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-brand-red',
  cancelled: 'bg-gray-100 text-gray-400',
}

export default async function StudentFeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const me = meRaw as unknown as { institution_id: string } | null
  const institutionId = me?.institution_id ?? ''
  const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', user!.id).single()
  const student = studentRaw as unknown as { id: string } | null
  const studentId = student?.id ?? ''

  const { data: invoicesRaw } = await supabase
    .from('fee_invoices')
    .select('id, invoice_number, amount, amount_paid, currency, status, due_date, description')
    .eq('student_id', studentId)
    .order('due_date', { ascending: false })

  const invoices = (invoicesRaw ?? []) as unknown as Array<{
    id: string; invoice_number: string | null; amount: number; amount_paid: number | null; currency: string
    status: string | null; due_date: string | null; description: string | null
  }>

  const outstanding = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + (Number(i.amount) - Number(i.amount_paid ?? 0)), 0)

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Fees</h1>

      <div className="card mb-6 border-l-4 border-brand-red">
        <p className="text-xs text-gray-500 mb-1">Total Outstanding</p>
        <p className="text-2xl font-display font-bold text-brand-red">{outstanding.toLocaleString()}</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Invoices ({invoices.length})</h2>
        {invoices.length === 0 ? (
          <p className="text-gray-400 text-sm">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Invoice</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Due</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const remaining = Number(inv.amount) - Number(inv.amount_paid ?? 0)
                  return (
                    <tr key={inv.id} className="border-b border-gray-50">
                      <td className="py-2 text-gray-700 font-mono text-xs">{inv.invoice_number ?? inv.id.slice(0, 8)}</td>
                      <td className="py-2 text-gray-500">{inv.description ?? '—'}</td>
                      <td className="py-2 text-gray-700">{inv.currency} {Number(inv.amount).toLocaleString()}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[inv.status ?? 'draft']}`}>
                          {(inv.status ?? 'draft').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                      <td className="py-2">
                        {(inv.status === 'sent' || inv.status === 'overdue') && remaining > 0 && (
                          <PayNowButton
                            invoiceId={inv.id}
                            userId={user!.id}
                            institutionId={institutionId}
                            amountDue={remaining}
                            currency={inv.currency}
                            description={inv.description ?? `Invoice ${inv.invoice_number ?? inv.id.slice(0, 8)}`}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
