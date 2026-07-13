import { createClient } from '@/lib/supabase/server'
import PayNowButton from './PayNowButton'

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: currency === 'VND' ? 0 : 2 }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-50 text-green-700',
  sent: 'bg-blue-50 text-brand-blue',
  overdue: 'bg-red-50 text-brand-red',
  draft: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-400',
}

export default async function ParentFeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: linksRaw } = await supabase
    .from('parent_student_links')
    .select('students(id, users(full_name))')
    .eq('parent_user_id', user!.id)

  const links = (linksRaw ?? []) as unknown as Array<{ students: { id: string; users: { full_name: string | null } | null } | null }>
  const children = links.map(l => l.students).filter((s): s is { id: string; users: { full_name: string | null } | null } => !!s)

  const childInvoices = await Promise.all(
    children.map(async child => {
      const { data: invoicesRaw } = await supabase
        .from('fee_invoices')
        .select('id, invoice_number, amount, amount_paid, currency, status, due_date, description, institution_id')
        .eq('student_id', child.id)
        .order('due_date', { ascending: false })
      const invoices = (invoicesRaw ?? []) as unknown as Array<{
        id: string; invoice_number: string; amount: number; amount_paid: number | null; currency: string
        status: string | null; due_date: string | null; description: string | null; institution_id: string
      }>
      return { child, invoices }
    })
  )

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Fees</h1>
      {childInvoices.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No children linked to your account yet. Contact admin.</div>
      ) : (
        childInvoices.map(({ child, invoices }) => (
          <div key={child.id} className="card mb-6">
            <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">{child.users?.full_name ?? 'Child'}</h2>
            {invoices.length === 0 ? (
              <p className="text-gray-400 text-sm">No invoices yet.</p>
            ) : (
              <div className="space-y-4">
                {invoices.map(inv => {
                  const remaining = Number(inv.amount) - Number(inv.amount_paid ?? 0)
                  const payable = remaining > 0 && (inv.status === 'sent' || inv.status === 'overdue')
                  return (
                    <div key={inv.id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-700">{inv.invoice_number}</p>
                          <p className="text-xs text-gray-500">{inv.description}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[inv.status ?? 'draft']}`}>
                          {(inv.status ?? 'draft').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3 text-sm">
                        <span className="text-gray-500">
                          {formatMoney(Number(inv.amount_paid ?? 0), inv.currency)} / {formatMoney(Number(inv.amount), inv.currency)}
                          {inv.due_date && ` · due ${new Date(inv.due_date).toLocaleDateString()}`}
                        </span>
                        {payable && <span className="font-semibold text-brand-red">{formatMoney(remaining, inv.currency)} due</span>}
                      </div>
                      {payable && (
                        <PayNowButton
                          invoiceId={inv.id}
                          userId={user!.id}
                          institutionId={inv.institution_id}
                          amountDue={remaining}
                          currency={inv.currency}
                          description={`Invoice ${inv.invoice_number}`}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
