/**
 * Mirrors apps/web/app/student/financial-aid.
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, Badge, EmptyState, LoadingView } from '../../components/ui'

type Record_ = { id: string; aid_type: string; provider: string; amount: number | null; currency: string; status: string; notes: string | null }

export default function StudentFinancialAidScreen() {
  const [records, setRecords] = useState<Record_[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', me.id).single()
    const studentId = (studentRaw as unknown as { id: string } | null)?.id ?? ''
    const { data } = await supabase
      .from('financial_aid_records').select('id, aid_type, provider, amount, currency, status, notes')
      .eq('student_id', studentId).order('created_at', { ascending: false })
    setRecords((data ?? []) as unknown as Record_[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <LoadingView />

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="Financial Aid" />
      {records.length === 0 ? (
        <EmptyState text="No scholarship, loan, or grant records on file yet." />
      ) : (
        records.map(r => (
          <Card key={r.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{r.aid_type} — {r.provider}</Text>
                {r.amount && <Text style={styles.sub}>{Number(r.amount).toLocaleString()} {r.currency}</Text>}
                {r.notes && <Text style={styles.sub}>{r.notes}</Text>}
              </View>
              <Badge label={r.status} status={r.status === 'disbursed' || r.status === 'approved' ? 'approved' : r.status === 'rejected' ? 'rejected' : 'pending'} />
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 14, fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
  sub: { fontSize: 12, color: colors.gray, marginTop: 2 },
})
