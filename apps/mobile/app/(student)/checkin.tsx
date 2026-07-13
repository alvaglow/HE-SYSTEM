/**
 * GPS + biometric attendance check-in — the flagship mobile-only feature
 * that the web app cannot offer (see the disclaimer on
 * apps/web/app/student/location/page.tsx: web browsers can't perform a
 * trustworthy on-device liveness check).
 *
 * Flow, matching the server contract in supabase/functions/attendance-checkin
 * and attendance-liveness-token:
 *   1. Get the device's current GPS position (expo-location).
 *   2. Run the OS biometric prompt (Face ID / Touch ID / fingerprint) via
 *      expo-local-authentication — this is the actual liveness proof.
 *   3. Only after that succeeds, ask the server to mint a short-lived signed
 *      liveness token (attendance-liveness-token) — LIVENESS_SECRET never
 *      ships to the client, so the token can only come from the server, and
 *      the server will only mint one for a caller who just proved presence.
 *   4. Submit the check-in with the GPS coords + liveness token; the server
 *      re-validates both the geofence and the token freshness (30s window).
 */
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import * as Location from 'expo-location'
import * as LocalAuthentication from 'expo-local-authentication'
import { supabase } from '../../lib/supabase'
import { getMe } from '../../lib/session'
import { attendanceLiveness, attendanceCheckin } from '../../lib/edgeFunctions'
import { colors, ScreenHeader, Card, EmptyState, LoadingView, PrimaryButton } from '../../components/ui'

type EligibleClass = {
  id: string; title: string | null; starts_at: string; ends_at: string
  location_name: string | null; subjects: { name: string } | null
}

type Step = 'idle' | 'locating' | 'authenticating' | 'minting' | 'submitting' | 'success' | 'error'

export default function CheckinScreen() {
  const [userId, setUserId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [classes, setClasses] = useState<EligibleClass[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const me = await getMe()
    if (!me) { setLoading(false); return }
    setUserId(me.id)

    const { data: studentRaw } = await supabase.from('students').select('id').eq('user_id', me.id).single()
    const sid = (studentRaw as unknown as { id: string } | null)?.id ?? ''
    setStudentId(sid)
    if (!sid) { setLoading(false); return }

    const { data: enrollmentsRaw } = await supabase.from('class_enrollments').select('class_id').eq('student_id', sid).eq('is_active', true)
    const classIds = ((enrollmentsRaw ?? []) as Array<{ class_id: string }>).map(e => e.class_id)
    if (classIds.length === 0) { setClasses([]); setLoading(false); return }

    // Eligible window: class must use GPS/biometric check-in, not be
    // cancelled, and be happening now (with a 15-minute grace window on
    // either side so students aren't locked out by clock skew or running
    // slightly early/late).
    const now = Date.now()
    const windowStart = new Date(now - 15 * 60 * 1000).toISOString()
    const windowEnd = new Date(now + 15 * 60 * 1000).toISOString()

    const { data } = await supabase
      .from('classes')
      .select('id, title, starts_at, ends_at, location_name, checkin_method, is_cancelled, subjects(name)')
      .in('id', classIds)
      .eq('checkin_method', 'gps_biometric')
      .eq('is_cancelled', false)
      .lte('starts_at', windowEnd)
      .gte('ends_at', windowStart)

    const eligible = (data ?? []) as unknown as EligibleClass[]
    setClasses(eligible)
    if (eligible.length === 1) setSelectedId(eligible[0].id)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleCheckIn() {
    if (!selectedId) return
    setError('')
    try {
      setStep('locating')
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') throw new Error('Location permission is required to check in.')
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })

      setStep('authenticating')
      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      const isEnrolled = await LocalAuthentication.isEnrolledAsync()
      if (!hasHardware || !isEnrolled) {
        throw new Error('Face ID/fingerprint is not set up on this device. Set it up in your device settings, or use OTP check-in instead.')
      }
      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm it’s really you to check in',
        disableDeviceFallback: false,
      })
      if (!auth.success) throw new Error('Biometric verification was not completed.')

      setStep('minting')
      const { token, timestamp } = await attendanceLiveness.mintToken()

      setStep('submitting')
      await attendanceCheckin.checkin({
        studentUserId: userId,
        classId: selectedId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        livenessToken: token,
        livenessTimestamp: timestamp,
      })

      setStep('success')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed.')
      setStep('error')
    }
  }

  if (loading) return <LoadingView />

  const stepLabel: Record<Step, string> = {
    idle: 'Check In',
    locating: 'Getting your location…',
    authenticating: 'Confirm with Face ID / fingerprint…',
    minting: 'Verifying…',
    submitting: 'Submitting check-in…',
    success: 'Checked in!',
    error: 'Try Again',
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <ScreenHeader title="GPS + Biometric Check-In" subtitle="Confirms your location and identity in one step." />

      {classes.length === 0 ? (
        <EmptyState text="No GPS/biometric classes are in session right now. Check back closer to your class start time, or use OTP check-in instead." />
      ) : (
        <>
          <Card>
            <Text style={styles.cardTitle}>Select Class</Text>
            {classes.map(c => (
              <View key={c.id} style={[styles.classOption, selectedId === c.id ? styles.classOptionActive : null]}
                onTouchEnd={() => setSelectedId(c.id)}>
                <Text style={styles.classTitle}>{c.title || c.subjects?.name || 'Class'}</Text>
                <Text style={styles.classSub}>
                  {new Date(c.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  {' – '}
                  {new Date(c.ends_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  {c.location_name ? ` · ${c.location_name}` : ''}
                </Text>
              </View>
            ))}
          </Card>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {step === 'success' ? <Text style={styles.success}>Checked in successfully.</Text> : null}

          <PrimaryButton
            label={stepLabel[step]}
            onPress={handleCheckIn}
            loading={step === 'locating' || step === 'authenticating' || step === 'minting' || step === 'submitting'}
            disabled={!selectedId || step === 'success'}
          />
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.blue, marginBottom: 10 },
  classOption: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 8 },
  classOptionActive: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  classTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  classSub: { fontSize: 12, color: colors.gray, marginTop: 2 },
  error: { color: colors.red, fontSize: 13, marginBottom: 10 },
  success: { color: colors.green, fontSize: 13, marginBottom: 10, fontWeight: '600' },
})
