/**
 * HE-SYSTEM — Partner Commission Formula
 * packages/shared/utils/commission-formula.ts
 *
 * Auto-scaling formula: Commission% = min(35%, 8% + students × 0.4%)
 * Tier thresholds: Starter 1-5, Bronze 6-15, Silver 16-30, Gold 31-60, Platinum 61+
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PartnerTier = 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface CommissionResult {
  studentsRecruited: number;
  commissionPct: number;
  tier: PartnerTier;
  tierLabel: string;
  amountEarned: number;
  tuitionFee: number;
  // Tier progress
  currentTierMin: number;
  nextTierMin: number | null;
  studentsToNextTier: number | null;
  earningsAtNextTier: number | null;
  progressPct: number;
}

export interface TierDefinition {
  key: PartnerTier;
  label: string;
  emoji: string;
  minStudents: number;
  maxStudents: number | null;
  minPct: number;
  maxPct: number;
  perks: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const BASE_PCT = 8;
export const SCALING_RATE = 0.4;     // % per student
export const MAX_PCT = 35;           // cap at 35%

export const TIERS: TierDefinition[] = [
  {
    key: 'starter',
    label: 'Starter',
    emoji: '⚪',
    minStudents: 1,
    maxStudents: 5,
    minPct: 8.4,
    maxPct: 10,
    perks: ['Basic partner badge', 'Partner portal access'],
  },
  {
    key: 'bronze',
    label: 'Bronze',
    emoji: '🥉',
    minStudents: 6,
    maxStudents: 15,
    minPct: 10.4,
    maxPct: 14,
    perks: ['Monthly digest email', 'Priority support'],
  },
  {
    key: 'silver',
    label: 'Silver',
    emoji: '🥈',
    minStudents: 16,
    maxStudents: 30,
    minPct: 14.4,
    maxPct: 20,
    perks: ['Co-marketing materials', 'Early intake access', 'Dedicated WhatsApp group'],
  },
  {
    key: 'gold',
    label: 'Gold',
    emoji: '🥇',
    minStudents: 31,
    maxStudents: 60,
    minPct: 20.4,
    maxPct: 32,
    perks: ['Dedicated account manager', 'RM500 milestone bonus at 31 students', 'Quarterly strategy call'],
  },
  {
    key: 'platinum',
    label: 'Platinum',
    emoji: '💎',
    minStudents: 61,
    maxStudents: null,
    minPct: 35,
    maxPct: 35,
    perks: ['35% commission (max)', 'Revenue share model', 'Annual partner gala', 'Premium co-branded badge'],
  },
];

// ─── Core formula ─────────────────────────────────────────────────────────────

/**
 * Calculate commission percentage for a given student count.
 * Formula: min(35%, 8% + (students × 0.4%))
 */
export function getCommissionPct(studentsRecruited: number): number {
  if (studentsRecruited <= 0) return 0;
  const raw = BASE_PCT + studentsRecruited * SCALING_RATE;
  return Math.min(MAX_PCT, parseFloat(raw.toFixed(2)));
}

/**
 * Get partner tier for a given student count.
 */
export function getPartnerTier(studentsRecruited: number): TierDefinition {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (studentsRecruited >= TIERS[i].minStudents) return TIERS[i];
  }
  return TIERS[0];
}

/**
 * Full commission calculation for a single recruit event.
 *
 * @param studentsRecruited  Partner's total students at time of calculation
 * @param tuitionFee         Student's tuition fee amount
 * @returns                  Full commission result with tier info and next milestone
 */
export function calculateCommission(
  studentsRecruited: number,
  tuitionFee: number
): CommissionResult {
  const commissionPct = getCommissionPct(studentsRecruited);
  const amountEarned = parseFloat((tuitionFee * (commissionPct / 100)).toFixed(2));
  const tier = getPartnerTier(studentsRecruited);

  // Next tier info
  const tierIdx = TIERS.findIndex(t => t.key === tier.key);
  const nextTier = tierIdx < TIERS.length - 1 ? TIERS[tierIdx + 1] : null;

  const studentsToNextTier = nextTier
    ? nextTier.minStudents - studentsRecruited
    : null;

  const earningsAtNextTier = nextTier
    ? parseFloat((tuitionFee * (getCommissionPct(nextTier.minStudents) / 100)).toFixed(2))
    : null;

  // Progress within current tier (0-100)
  const tierRange = tier.maxStudents !== null
    ? tier.maxStudents - tier.minStudents
    : 1;
  const positionInTier = studentsRecruited - tier.minStudents;
  const progressPct = tier.maxStudents !== null
    ? Math.min(100, Math.round((positionInTier / tierRange) * 100))
    : 100;

  return {
    studentsRecruited,
    commissionPct,
    tier: tier.key,
    tierLabel: `${tier.emoji} ${tier.label}`,
    amountEarned,
    tuitionFee,
    currentTierMin: tier.minStudents,
    nextTierMin: nextTier?.minStudents ?? null,
    studentsToNextTier,
    earningsAtNextTier,
    progressPct,
  };
}

/**
 * Batch calculation for a partner's all-time earnings.
 *
 * @param recruits  Array of {tuitionFee, enrolledAt} for each enrolled student
 * @returns         Running total and per-recruit breakdown
 */
export function calculateLifetimeEarnings(
  recruits: Array<{ tuitionFee: number; enrolledAt: Date }>
): {
  totalEarned: number;
  totalStudents: number;
  currentTier: TierDefinition;
  currentPct: number;
  breakdown: Array<CommissionResult & { enrolledAt: Date }>;
} {
  // Sort by enrolment date — order matters for cumulative count
  const sorted = [...recruits].sort(
    (a, b) => a.enrolledAt.getTime() - b.enrolledAt.getTime()
  );

  let totalEarned = 0;
  const breakdown: Array<CommissionResult & { enrolledAt: Date }> = [];

  sorted.forEach((r, idx) => {
    const studentsAtTime = idx + 1;
    const result = calculateCommission(studentsAtTime, r.tuitionFee);
    totalEarned += result.amountEarned;
    breakdown.push({ ...result, enrolledAt: r.enrolledAt });
  });

  const totalStudents = sorted.length;
  const currentTier = getPartnerTier(totalStudents);
  const currentPct = getCommissionPct(totalStudents);

  return {
    totalEarned: parseFloat(totalEarned.toFixed(2)),
    totalStudents,
    currentTier,
    currentPct,
    breakdown,
  };
}

/**
 * Projection table — how much a partner would earn at each student milestone.
 * Useful for the "Formula Explainer" page in partner portal.
 */
export function getCommissionProjections(
  tuitionFee: number,
  milestones: number[] = [1, 5, 10, 15, 20, 25, 30, 40, 50, 61, 75, 100]
): Array<{
  students: number;
  pct: number;
  perStudentEarned: number;
  totalEarned: number;
  tier: string;
}> {
  return milestones.map(students => {
    const pct = getCommissionPct(students);
    const perStudentEarned = parseFloat((tuitionFee * (pct / 100)).toFixed(2));
    const totalEarned = parseFloat((students * perStudentEarned).toFixed(2));
    const tier = getPartnerTier(students);
    return {
      students,
      pct,
      perStudentEarned,
      totalEarned,
      tier: `${tier.emoji} ${tier.label}`,
    };
  });
}
