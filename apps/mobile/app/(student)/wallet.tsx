/**
 * Mirrors apps/web/app/student/wallet (StudentWalletPage).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, ListRow, EmptyState, LoadingView } from '../../components/ui'

type Transaction = { id: string; type: string | null; amount: number; description: string | null; created_at: string }

export default function WalletScreen() {
  const [balance, setBalance] = useState<{ amount: number; currency: string } | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: walletRaw } = await supabase.from('digital_wallets').select('id, balance, currency').eq('user_id', me.id).single()
    const wallet = walletRaw as unknown as { id: string; balance: number; currency: string } | null

    if (wallet) {
      setBalance({ amount: Number(wallet.balance), currency: wallet.currency })
      const { data } = await supabase
        .from('wallet_transactions')
        .select('id, type, amount, description, created_at')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setTransactions((data ?? []) as unknown as Transaction[])
    }
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Wallet" />

      <Card>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceValue}>{balance ? `${balance.currency} ${balance.amount.toLocaleString()}` : '—'}</Text>
      </Card>

      <Text style={styles.sectionLabel}>Transaction History ({transactions.length})</Text>
      {transactions.length === 0 ? (
        <EmptyState text="No transactions yet." />
      ) : (
        <Card>
          {transactions.map(t => (
            <ListRow key={t.id}
              title={t.description ?? (t.type === 'credit' ? 'Top-up' : 'Deduction')}
              subtitle={new Date(t.created_at).toLocaleString()}
              right={
                <Text style={[styles.txAmount, { color: t.type === 'credit' ? colors.green : colors.red }]}>
                  {t.type === 'credit' ? '+' : '−'}{Math.abs(Number(t.amount)).toLocaleString()}
                </Text>
              }
            />
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  balanceLabel: { fontSize: 12, color: colors.gray, marginBottom: 4 },
  balanceValue: { fontSize: 28, fontWeight: '700', color: colors.blue },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.gray, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  txAmount: { fontWeight: '700', fontSize: 13 },
})
