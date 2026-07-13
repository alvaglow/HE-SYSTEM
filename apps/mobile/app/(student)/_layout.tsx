import { Stack } from 'expo-router'

export default function StudentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="checkin" />
      <Stack.Screen name="fees" />
      <Stack.Screen name="location" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="results" />
      <Stack.Screen name="timetable" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="library" />
      <Stack.Screen name="directory" />
      <Stack.Screen name="assistant" />
      <Stack.Screen name="facilities" />
      <Stack.Screen name="exams" />
      <Stack.Screen name="transcript" />
      <Stack.Screen name="financial-aid" />
      <Stack.Screen name="shuttle" />
      <Stack.Screen name="assignments" />
      <Stack.Screen name="registration" />
    </Stack>
  )
}
