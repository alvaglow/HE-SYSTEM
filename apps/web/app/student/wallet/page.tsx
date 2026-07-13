import { createClient } from '@/lib/supabase/server'

const TX_STYLES: Record<string, string> = {
  credit: 'text-green-600',
  debit: 'text-brand-red',
}

export default async function StudentWalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: walletRaw } = await supabase
    .from('digital_wallets')
    .select('id, balance, currency')
    .eq('user_id', user!.id)
    .single()

  const wallet = walletRaw as unknown as { id: string; balance: number; currency: string } | null

  const { data: txRaw } = wallet
    ? await supabase
        .from('wallet_transactions')
        .select('id, type, amount, balance_after, description, created_at')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  const transactions = (txRaw ?? []) as unknown as Array<{
    id: string; type: string | null; amount: number; balance_after: number; description: string | null; created_at: string
  }>

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Wallet</h1>

      <div className="card mb-6 border-l-4 border-brand-blue">
        <p className="text-xs text-gray-500 mb-1">Current Balance</p>
        <p className="text-3xl font-display font-bold text-brand-blue">
          {wallet ? `${wallet.currency} ${Number(wallet.balance).toLocaleString()}` : '—'}
        </p>
      </div>

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">Transaction History ({transactions.length})</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-400 text-sm">No transactions yet.</p>
        ) : (
          <ul className="space-y-3">
            {transactions.map(t => (
              <li key={t.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-gray-700">{t.description ?? (t.type === 'credit' ? 'Top-up' : 'Deduction')}</p>
                  <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleString()}</p>
                </div>
                <p className={`font-medium ${TX_STYLES[t.type ?? 'debit'] ?? 'text-gray-700'}`}>
                  {t.type === 'credit' ? '+' : '−'}{Math.abs(Number(t.amount)).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
