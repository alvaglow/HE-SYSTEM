import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import { supabase } from '../lib/supabase'

const queryClient = new QueryClient()

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export default function RootLayout() {
  useEffect(() => {
    // Register push token on mount
    Notifications.getExpoPushTokenAsync().then(async ({ data: token }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('users').update({ expo_push_token: token }).eq('id', user.id)
      }
    }).catch(() => {})
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(partner)" />
        <Stack.Screen name="(parent)" />
      </Stack>
    </QueryClientProvider>
  )
}
