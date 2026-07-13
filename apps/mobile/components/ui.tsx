/**
 * HE-SYSTEM mobile — shared UI kit
 *
 * React Native has no Tailwind/CSS cascade, so every screen re-implementing
 * cards/badges/rows from scratch would mean the same ~15 StyleSheet blocks
 * copy-pasted 40+ times across every portal screen. This file centralizes
 * that once, mirroring the visual language already established in the web
 * app (brand-blue #1B3D8C, brand-red #DC2626) and in PortalHome.tsx, so every
 * portal screen looks consistent and stays small.
 */
import { ReactNode } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native'
import { router } from 'expo-router'

export const colors = {
  blue: '#1B3D8C',
  blueLight: '#EEF2FB',
  red: '#DC2626',
  redLight: '#FEF2F2',
  green: '#16A34A',
  greenLight: '#F0FDF4',
  amber: '#D97706',
  amberLight: '#FFFBEB',
  purple: '#7C3AED',
  purpleLight: '#F5F3FF',
  gray: '#64748B',
  grayLight: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#94A3B8',
  bg: '#F8FAFC',
  white: '#FFFFFF',
}

export const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  present: { bg: colors.greenLight, fg: colors.green },
  approved: { bg: colors.greenLight, fg: colors.green },
  paid: { bg: colors.greenLight, fg: colors.green },
  completed: { bg: colors.greenLight, fg: colors.green },
  active: { bg: colors.greenLight, fg: colors.green },
  published: { bg: colors.greenLight, fg: colors.green },
  enrolled: { bg: colors.greenLight, fg: colors.green },
  absent: { bg: colors.redLight, fg: colors.red },
  rejected: { bg: colors.redLight, fg: colors.red },
  overdue: { bg: colors.redLight, fg: colors.red },
  cancelled: { bg: colors.grayLight, fg: colors.gray },
  dropped: { bg: colors.redLight, fg: colors.red },
  pending: { bg: colors.amberLight, fg: colors.amber },
  requested: { bg: colors.amberLight, fg: colors.amber },
  late: { bg: colors.amberLight, fg: colors.amber },
  applied: { bg: colors.amberLight, fg: colors.amber },
  processing: { bg: colors.blueLight, fg: colors.blue },
  sent: { bg: colors.blueLight, fg: colors.blue },
  excused: { bg: colors.blueLight, fg: colors.blue },
  draft: { bg: colors.grayLight, fg: colors.gray },
  prospect: { bg: colors.grayLight, fg: colors.gray },
  inactive: { bg: colors.grayLight, fg: colors.gray },
}

export function Badge({ label, status }: { label: string; status?: string }) {
  const c = (status && STATUS_COLORS[status.toLowerCase()]) || { bg: colors.grayLight, fg: colors.gray }
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{label.toUpperCase()}</Text>
    </View>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <View style={[styles.statCard, accent ? { borderTopColor: accent, borderTopWidth: 3 } : null]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  )
}

export function ScreenHeader({ title, subtitle, showBack = true }: { title: string; subtitle?: string; showBack?: boolean }) {
  return (
    <View style={styles.header}>
      {showBack && (
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  )
}

export function ListRow({ title, subtitle, right, onPress }: { title: string; subtitle?: string; right?: ReactNode; onPress?: () => void }) {
  const Wrapper = onPress ? TouchableOpacity : View
  return (
    <Wrapper style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </Wrapper>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  )
}

export function LoadingView() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.blue} />
    </View>
  )
}

export function MenuCard({ label, sublabel, onPress, accent }: { label: string; sublabel?: string; onPress: () => void; accent?: string }) {
  return (
    <TouchableOpacity style={[styles.menuCard, accent ? { borderLeftColor: accent, borderLeftWidth: 4 } : null]} onPress={onPress}>
      <Text style={styles.menuCardLabel}>{label}</Text>
      {sublabel ? <Text style={styles.menuCardSub}>{sublabel}</Text> : null}
    </TouchableOpacity>
  )
}

/**
 * Widget-style quick-access tile for a grid dashboard layout (2 per row).
 * Own design for HE-SYSTEM's home screen — an icon-forward tile grid is a
 * common mobile-app pattern, not anyone's proprietary layout.
 */
export function TileCard({ icon, label, onPress, accent }: { icon: string; label: string; onPress: () => void; accent?: string }) {
  const tint = accent ?? colors.blue
  return (
    <TouchableOpacity style={styles.tileCard} onPress={onPress}>
      <View style={[styles.tileIconWrap, { backgroundColor: `${tint}1A` }]}>
        <Text style={styles.tileIcon}>{icon}</Text>
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

export function TileGrid({ children }: { children: ReactNode }) {
  return <View style={styles.tileGrid}>{children}</View>
}

export function PrimaryButton({ label, onPress, loading, disabled }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <TouchableOpacity style={[styles.primaryBtn, disabled ? { opacity: 0.5 } : null]} onPress={onPress} disabled={disabled || loading}>
      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>{label}</Text>}
    </TouchableOpacity>
  )
}

export function TextField({
  value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline,
}: {
  value: string; onChangeText: (v: string) => void; placeholder?: string
  secureTextEntry?: boolean; keyboardType?: 'default' | 'email-address' | 'numeric' | 'decimal-pad'; multiline?: boolean
}) {
  const { TextInput } = require('react-native')
  return (
    <TextInput
      style={[styles.input, multiline ? { height: 90, textAlignVertical: 'top' } : null]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      multiline={multiline}
      autoCapitalize="none"
    />
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  statCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, flex: 1, minWidth: 140, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  statLabel: { fontSize: 12, color: colors.gray, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.blue },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  header: { paddingTop: 8, paddingBottom: 16 },
  backBtn: { marginBottom: 8 },
  backBtnText: { color: colors.blue, fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.blue },
  headerSubtitle: { fontSize: 13, color: colors.gray, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  rowTitle: { fontSize: 14, color: colors.text, fontWeight: '500' },
  rowSubtitle: { fontSize: 12, color: colors.gray, marginTop: 2 },
  empty: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'ce