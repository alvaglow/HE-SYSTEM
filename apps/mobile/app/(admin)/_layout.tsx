import { Stack } from 'expo-router'

// Shared route group for both "admin" and "management" roles (see
// app/index.tsx ROLE_ROUTES) — the underlying RLS treats both roles
// equivalently (is_admin_or_above()), and web only splits them into two
// folders for navigation-scoping reasons. Mobile keeps one group and lets
// index.tsx show a role-appropriate menu instead of duplicating every
// enrolment/KPI/partners screen twice.
export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="students" />
      <Stack.Screen name="staff" />
      <Stack.Screen name="enrolment" />
      <Stack.Screen name="invoices" />
      <Stack.Screen name="kpi" />
      <Stack.Screen name="partners" />
      <Stack.Screen name="leave" />
      <Stack.Screen name="payouts" />
      <Stack.Screen name="timetable" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="finance" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="library" />
      <Stack.Screen name="rooms" />
      <Stack.Screen name="exams" />
      <Stack.Screen name="financial-aid" />
      <Stack.Screen name="shuttle" />
      <Stack.Screen name="audit-log" />
      <Stack.Screen name="support" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="graduation" />
    </Stack>
  )
}
