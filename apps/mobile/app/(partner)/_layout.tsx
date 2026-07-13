import { Stack } from 'expo-router'

export default function PartnerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="commission" />
      <Stack.Screen name="leaderboard" />
      <Stack.Screen name="payouts" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="students" />
    </Stack>
  )
}
