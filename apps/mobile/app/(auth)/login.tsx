import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    // Middleware / router will redirect to correct portal
    router.replace('/')
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>HE-SYSTEM</Text>
        <Text style={styles.subtitle}>Happy English Platform</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1B3D8C', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 28 },
  title: { fontSize: 28, fontWeight: '700', color: '#1B3D8C', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 28 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 12 },
  error: { color: '#DC2626', fontSize: 13, marginBottom: 8 },
  button: { backgroundColor: '#1B3D8C', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 15 },
})
