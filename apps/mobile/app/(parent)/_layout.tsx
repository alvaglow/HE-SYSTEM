import { Stack } from 'expo-router'

export default function ParentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="fees" />
      <Stack.Screen name="location" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="results" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="assignments" />
      <Stack.Screen name="exams" />
      <Stack.Screen name="transcript" />
      <Stack.Screen name="financial-aid" />
      <Stack.Screen name="shuttle" />
    </Stack>
  )
}
