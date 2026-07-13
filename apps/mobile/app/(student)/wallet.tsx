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
type TypeFilter = 'all' | 'credit' | 'debit'
type PeriodFilter = 'all' | '30' | '90'

export default function WalletScreen() {
  const [balance, setBalance] = useState<{ amount: number; currency: string } | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')
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
        .limit(200)
      setTransactions((data ?? []) as unknown as Transaction[])
    }
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  const now = Date.now()
  const filtered = transactions.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    if (periodFilter !== 'all') {
      const days = Number(periodFilter)
      if (now - new Date(t.created_at).getTime() > days * 86400000) return false
    }
    return true
  })

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Wallet" />

      <Card>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceValue}>{balance ? `${balance.currency} ${balance.amount.toLocaleString()}` : '—'}</Text>
      </Card>

      <View style={styles.filterRow}>
        {(['all', 'credit', 'debit'] as TypeFilter[]).map(t => (
          <Text key={t} onPress={() => setTypeFilter(t)} style={[chipStyles.chip, typeFilter === t ? chipStyles.chipActive : null]}>
            {t === 'all' ? 'All' : t === 'credit' ? 'Credits' : 'Debits'}
          </Text>
        ))}
      </View>
      <View style={styles.filterRow}>
        {(['all', '30', '90'] as PeriodFilter[]).map(p => (
          <Text key={p} onPress={() => setPeriodFilter(p)} style={[chipStyles.chip, periodFilter === p ? chipStyles.chipActive : null]}>
            {p === 'all' ? 'All time' : `Last ${p} days`}
          </Text>
 