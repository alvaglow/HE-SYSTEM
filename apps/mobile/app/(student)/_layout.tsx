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
      <Stack.Screen