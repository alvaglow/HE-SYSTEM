/**
 * Mirrors apps/web/app/parent/financial-aid (ParentFinancialAidPage).
 */
import { useCallback, useState } from 'react'
import { Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, ListRow, Badge, EmptyState, LoadingView } from '../../components/ui'

type Record_ = { id: string; aid_type: string; provider: string; amount: number | null; currency: string; status: string; notes: string | null }
type ChildBlock = { id: string; name: string; records: Record_[] }

const STATUS_MAP: Record<string, 'approved' | 'rejected' | 'pending'> = { approved: 'approved', disbursed: 'approved', rejected: 'rejected', applied: 'pending' }

export default function ParentFinancialAidScreen() {
  const [blocks, setBlocks] = useState<ChildBlock[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }

    const { data: linksRaw } = await supabase
      .from('parent_student_links')
      .select('students(id, users(full_name))')
      .eq('parent_user_id', me.id)
    const links = (linksRaw ?? []) as unknown as Array<{ students: { id: string; users: { full_name: string | null } | null } | null }>
    const children = links.map(l => l.students).filter((s): s is { id: string; users: { full_name: string | null } | null } => !!s)

    const results = await Promise.all(children.map(async child => {
      const { data: recordsRaw } = await supabase
        .from('financial_aid_records')
        .select('id, aid_type, provider, amount, currency, status, notes')
        .eq('student_id', child.id)
        .order('created_at', { ascending: false })
      return { id: child.id, name: child.users?.full_name ?? 'Child', records: (recordsRaw ?? []) as unknown as Record_[] }
    }))
    setBlocks(results)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Financial Aid" />
      {blocks.length === 0 ? (
        <EmptyState text="No children linked to your account yet. Contact admin." />
      ) : (
        blocks.map(b => (
          <Card key={b.id}>
            <Text style={styles.childHeader}>{b.name}</Text>
            {b.records.length === 0 ? (
              <EmptyState text="No scholarship, loan, or grant records on file yet." />
            ) : (
              b.records.map(r => (
                <ListRow key={r.id}
                  title={`${r.aid_type} — ${r.provider}`}
                  subtitle={r.amount ? `${Number(r.amount).toLocaleString()} ${r.currency}` : undefined}
                  right={<Badge label={r.status.toUpperCase()} status={STATUS_MAP[r.status] ?? 'pending'} />} />
              ))
            )}
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  childHeader: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
})
