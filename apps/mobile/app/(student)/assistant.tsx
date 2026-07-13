/**
 * Mirrors apps/web/components/AiAssistantWidget as a full screen instead of
 * a floating panel (better fit for mobile). Own implementation, not a copy
 * of any other campus app's assistant UI or branding.
 */
import { useState, useRef } from 'react'
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { aiAssistant } from '../../lib/edgeFunctions'
import { colors, ScreenHeader, TextField, PrimaryButton } from '../../components/ui'

type ChatMessage = { role: 'user' | 'assistant'; text: string }

export default function AssistantScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<ScrollView>(null)

  async function handleAsk() {
    const q = question.trim()
    if (!q) return
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setQuestion('')
    setLoading(true)
    setError('')
    try {
      const res = await aiAssistant(q)
      setMessages(prev => [...prev, { role: 'assistant', text: res.answer }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Campus Assistant" subtitle="Ask about your fees, attendance, CGPA, or next class" />
      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={{ paddingVertical: 8 }}>
        {messages.length === 0 && (
          <Text style={styles.empty}>Ask me anything about your own records — I only know your data.</Text>
        )}
        {messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
            <Text style={m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant}>{m.text}</Text>
          </View>
        ))}
        {loading && <Text style={styles.thinking}>Thinking…</Text>}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View style={styles.inputRow}>
        <View style={{ flex: 1 }}>
          <TextField value={question} onChangeText={setQuestion} placeholder="Ask a question…" />
        </View>
        <View style={{ marginLeft: 8, marginBottom: 10 }}>
          <PrimaryButton label="Send" onPress={handleAsk} loading={loading} disabled={!question.trim()} />
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  messages: { flex: 1 },
  empty: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 24 },
  bubble: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, maxWidth: '85%' },
  bubbleUser: { backgroundColor: colors.blue, alignSelf: 'flex-end' },
  bubbleAssistant: { backgroundColor: colors.grayLight, alignSelf: 'flex-start' },
  bubbleTextUser: { color: colors.white, fontSize: 14 },
  bubbleTextAssistant: { color: colors.text, fontSize: 14 },
  thinking: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  error: { fontSize: 12, color: colors.red, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 12 },
})
