/**
 * HE-SYSTEM — Shared TypeScript Types
 * packages/shared/types/index.ts
 */

export type UserRole = 'student' | 'teacher' | 'admin' | 'management' | 'partner' | 'parent'
export type ClassType = 'campus' | 'remote' | 'home'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type PartnerTier = 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum'
export type KpiGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface NavItem {
  label: string
  labelVi?: string
  href: string
  icon?: string
}

export interface DashboardStat {
  label: string
  value: string | number
  color?: string
  trend?: 'up' | 'down' | 'neutral'
}

export interface ClassLocation {
  type: ClassType
  name?: string
  address?: string
  lat?: number
  lng?: number
  joinUrl?: string
  roomNumber?: string
}
