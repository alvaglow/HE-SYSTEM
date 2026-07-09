/**
 * Shared "portal home" screen used by each role group ((admin), (teacher),
 * (student), (partner), (parent)) until each gets its own real screens.
 *
 * AUDIT FIX: these five route groups existed as empty directories referenced
 * by the root Stack navigator — navigating to any of them had no route to
 * render. This gives every portal a real, working landing screen (shows the
 * signed-in user's name/role from Supabase and a working sign-out button)
 * instead of a blank crash.
 */
import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'

export default function PortalHome({ title }: { title: string }) {
  const [name, setName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('users').select('full_name').eq('id', user.id).single()
        setName(data?.full_name ?? user.email ?? null)
      }
      setLoading(false)
    })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {loading ? (
        <ActivityIndicator color="#1B3D8C" />
      ) : (
        <Text style={styles.subtitle}>{name ? `Signed in as ${name}` : 'Signed in'}</Text>
      )}
      <Text style={styles.note}>This portal is under construction. More features are on the way.</Text>
      <TouchableOpacity style={styles.button} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  title: { fontSize: 22, fontWeight: '700', color: '#1B3D8C', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#475569', marginBottom: 16 },
  note: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#1B3D8C', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 14 },
})
