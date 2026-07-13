import { Stack } from 'expo-router'

export default function TeacherLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="grades" />
      <Stack.Screen name="kpi" />
      <Stack.Screen name="leave" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="students" />
      <Stack.Screen name="timetable" />
      <Stack.Screen name="announcements" />
    </Stack>
  )
}
