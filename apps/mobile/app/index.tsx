/**
 * Root gate screen.
 *
 * AUDIT FIX: this file didn't exist. The root _layout.tsx declares a
 * Stack.Screen for "/", and login.tsx calls `router.replace('/')` after
 * sign-in expecting "middleware / router will redirect to the correct
 * portal" — but nothing on disk ever did that redirect, and Expo Router has
 * no middleware concept (that comment described the Next.js web app, not
 * this app). Without this file, `/` had no matching route at all.
 *
 * This screen checks the current Supabase session, looks up the caller's
 * role, and sends them to (auth)/login if unauthenticated or to the right
 * portal group if not.
 */
import { useEffect, useState } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'

const ROLE_ROUTES: Record<string, string> = {
  admin: '/(admin)',
  management: '/(admin)',
  teacher: '/(teacher)',
  student: '/(student)',
  partner: '/(partner)',
  parent: '/(parent)',
}

export default function Index() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function gate() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        if (!cancelled) router.replace('/(auth)/login')
        return
      }
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      const dest = (profile?.role && ROLE_ROUTES[profile.role]) || '/(auth)/login'
      if (!cancelled) router.replace(dest as never)
    }

    gate().finally(() => { if (!cancelled) setReady(true) })
    return () => { cancelled = true }
  }, [])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1B3D8C" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
})
