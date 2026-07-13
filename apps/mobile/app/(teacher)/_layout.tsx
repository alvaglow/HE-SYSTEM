import { Stack } from 'expo-router'

export default function TeacherLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="grades" />
      <Stack.Screen name="assignments" />
      <Stack.Screen name="kpi" />
      <Stack.Screen name="exams" />
      <Stack.Screen name="shuttle" />
      <Stack.Screen name="facilities" />
      <Stack.Screen name="leave" />
      <Stack.Screen name