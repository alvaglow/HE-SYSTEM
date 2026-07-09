/**
 * HE-SYSTEM — Partner Commission Engine
 * packages/shared/utils/commission-formula.ts
 *
 * AUDIT FIX: this file (and utils/kpi-calculator.ts) was referenced by
 * package.json's `exports`, re-exported from index.ts, and directly imported
 * by apps/web/app/(partner)/dashboard/page.tsx — but didn't exist on disk.
 * That broke `pnpm build` for the whole web app. Recreated here to match the
 * formula documented in the root README:
 *
 *   Commission% = min(35%, 8% + students × 0.4%)
 *   Starter (1-5): 8.4-10%  Bronze (6-15): 10.4-14%  Silver (16-30): 14.4-20%
 *   Gold (31-60): 20.4-32%  Platinum (61+): 35% (capped)
 *
 * The commission-calculate edge function has its own inline copy of this
 * formula (server-side, authoritative for what actually gets paid) — this
 * file is for the frontend to render the same numbers without a round trip.
 */
import type { PartnerTier } from '../types/index'

const BASE_PCT = 8
const RATE_PER_STUDENT = 0.4
const MAX_PCT = 35

export function getCommissionPct(studentsRecruited: number): number {
  return Math.min(MAX_PCT, BASE_PCT + studentsRecruited * RATE_PER_STUDENT)
}

export interface TierInfo {
  tier: PartnerTier
  emoji: string
  label: string
  minStudents: number
  maxStudents: number | null // null = uncapped (Platinum)
}

const TIERS: TierInfo[] = [
  { tier: 'starter', emoji: '⚪', label: 'Starter', minStudents: 0, maxStudents: 5 },
  { tier: 'bronze', emoji: '🥉', label: 'Bronze', minStudents: 6, maxStudents: 15 },
  { tier: 'silver', emoji: '🥈', label: 'Silver', minStudents: 16, maxStudents: 30 },
  { tier: 'gold', emoji: '🥇', label: 'Gold', minStudents: 31, maxStudents: 60 },
  { tier: 'platinum', emoji: '💎', label: 'Platinum', minStudents: 61, maxStudents: null },
]

export function getPartnerTier(studentsRecruited: number): TierInfo {
  return (
    TIERS.find((t) => studentsRecruited >= t.minStudents && (t.maxStudents === null || studentsRecruited <= t.maxStudents)) ??
    TIERS[0]
  )
}

export function getAllTiers(): TierInfo[] {
  return TIERS
}
