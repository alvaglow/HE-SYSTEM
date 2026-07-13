/**
 * Mirrors apps/web/app/student/profile (StudentProfilePage).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { colors, ScreenHeader, Card, LoadingView } from '../../components/ui'

function formatDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
}
function daysUntil(d: string | null): number | null {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

type Profile = {
  fullName: string | null; email: string; institutionName: string
  studentNumber: string | null; intakeDate: string | null; expectedGrad: string | null
  programmeName: string | null; programmeCode: string | null
  nationality: string | null; passportNumber: string | null; emgsStatus: string | null; studentPassExpiry: string | null
}

export default function StudentProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [savingTheme, setSavingTheme] = useState(false)

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setUserId(me.id)

    const [{ data: userRaw }, { data: studentRaw }, { data: instRaw }] = await Promise.all([
      supabase.from('users').select('full_name, email, theme').eq('id', me.id).single(),
      supabase.from('students').select('student_number, intake_date, expected_grad, nationality, passport_number, emgs_status, student_pass_expiry, programmes(name, code)').eq('user_id', me.id).single(),
      supabase.from('institutions').select('name').eq('id', me.institutionId).single(),
    ])
    setTheme((userRaw as unknown as { theme?: string } | null)?.theme === 'dark' ? 'dark' : 'light')

    const u = userRaw as unknown as { full_name: string | null; email: string } | null
    const s = studentRaw as unknown as {
      student_number: string | null; intake_date: string | null; expected_grad: string | null
      nationality: string | null; passport_number: string | null; emgs_status: string | null; student_pass_expiry: string | null
      programmes: { name: string; code: string | null } | null
    } | null
    const inst = instRaw as unknown as { name: string } | null

    setProfile({
      fullName: u?.full_name ?? null, email: u?.email ?? '', institutionName: inst?.name ?? '',
      studentNumber: s?.student_number ?? null, intakeDate: s?.intake_date ?? null, expectedGrad: s?.expected_grad ?? null,
      programmeName: s?.programmes?.name ?? null, programmeCode: s?.programmes?.code ?? null,
      nationality: s?.nationality ?? null, passportNumber: s?.passport_number ?? null,
      emgsStatus: s?.emgs_status ?? null, studentPassExpiry: s?.student_pass_expiry ?? null,
    })
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setSavingTheme(true)
    setTheme(next)
    await supabase.from('users').update({ theme: next } as unknown as never).eq('id', userId)
    setSavingTheme(false)
  }

  if (loading) return <LoadingView />

  const passExpiryDays = daysUntil(profile?.studentPassExpiry ?? null)
  const passExpiringSoon = passExpiryDays !== null && passExpiryDays <= 60

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="My Profile" />

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <TouchableOpacity onPress={toggleTheme} disabled={savingTheme} style={styles.themeBtn}>
            <Text style={styles.themeBtnText}>{theme === 'dark' ? '🌙 Dark' : '☀️ Light'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.themeNote}>
          Saved to your account — full in-app dark theming is coming to the mobile app soon; this sets your preference for now.
        </Text>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(profile?.fullName ?? '?').charAt(0).toUpperCase()}</Text></View>
          <View>
            <Text style={styles.name}>{profile?.fullName ?? '—'}</Text>
            <Text style={styles.email}>{profile?.email}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Academic</Text>
        <Row label="Institution" value={profile?.institutionName || '—'} />
        <Row label="Programme" value={profile?.programmeName ? `${profile.programmeName}${profile.programmeCode ? ` (${profile.programmeCode})` : ''}` : '—'} />
        <Row label="Student ID" value={profile?.studentNumber ?? '—'} />
        <Row label="Intake Date" value={formatDate(profile?.intakeDate ?? null)} />
        <Row label="Expected Graduation" value={formatDate(profile?.expectedGrad ?? null)} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Personal & Immigration</Text>
        <Row label="Nationality" value={profile?.nationality ?? '—'} />
        <Row label="Passport / IC Number" value={profile?.passportNumber ?? '—'} />
        <Row label="EMGS Status" value={profile?.emgsStatus ?? '—'} />
        <Row label="Student Pass Expiry" value={formatDate(profile?.studentPassExpiry ?? null)} valueColor={passExpiringSoon ? colors.red : undefined} />
        {passExpiringSoon && (
          <Text style={styles.warning}>
            Your student pass expires {passExpiryDays !== null && passExpiryDays < 0 ? 'has expired' : `in ${passExpiryDays} days`}. Contact the Admin office to arrange renewal.
          </Text>
        )}
      </Card>
    </ScrollView>
  )
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: colors.blue },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.gray, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.blue, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 13, color: colors.gray },
  rowValue: { fontSize: 13, color: colors.text, fontWeight: '600', textAlign: 'right', flexShrink: 1, marginLeft: 10 },
  warning: { fontSize: 12, color: colors.red, backgroundColor: colors.redLight, borderRadius: 8, padding: 10, marginTop: 8 },
  themeBtn: { backgroundColor: colors.blueLight, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  themeBtnText: { fontSize: 13, fontWeight: '600', color: colors.blue },
  themeNote: { fontSize: 12, color: colors.gray, marginTop: 8, lineHeight: 17 },
})
