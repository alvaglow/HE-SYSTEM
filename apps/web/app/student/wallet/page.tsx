import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const TX_STYLES: Record<string, string> = {
  credit: 'text-green-600',
  debit: 'text-brand-red',
}

export default async function StudentWalletPage({
  searchParams,
}: {
  searchParams: { type?: string; from?: string; to?: string }
}) {
  const { type: typeFilter = 'all', from, to } = searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: walletRaw } = await supabase
    .from('digital_wallets')
    .select('id, balance, currency')
    .eq('user_id', user!.id)
    .single()

  const wallet = walletRaw as unknown as { id: string; balance: number; currency: string } | null

  let txQuery = wallet
    ? supabase
        .from('wallet_transactions')
        .select('id, type, amount, balance_after, description, created_at')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(100)
    : null

  if (txQuery && typeFilter !== 'all') txQuery = txQuery.eq('type', typeFilter)
  if (txQuery && from) txQuery = txQuery.gte('created_at', new Date(from).toISOString())
  if (txQuery && to) txQuery = txQuery.lte('created_at', new Date(new Date(to).getTime() + 86400000).toISOString())

  const { data: txRaw } = txQuery ? await txQuery : { data: [] }

  const transactions = (txRaw ?? []) as unknown as Array<{
    id: string; type: string | null; amount: number; balance_after: number; description: string | null; created_at: string
  }>

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = { type: typeFilter, from, to, ...overrides }
    if (merged.type && merged.type !== 'all') params.set('type', merged.type)
    if (merged.from) params.set('from', merged.from)
    if (merged.to) params.set('to', merged.to)
    const qs = params.toString()
    return qs ? `/student/wallet?${qs}` : '/student/wallet'
  }

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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
