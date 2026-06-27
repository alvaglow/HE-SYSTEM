/**
 * HE-SYSTEM — KPI Calculator
 * packages/shared/utils/kpi-calculator.ts
 *
 * Teacher KPI: 4 pillars
 *   P1 Teaching Hours & Attendance — 25%
 *   P2 Student Outcomes           — 35%
 *   P3 Administrative Tasks       — 25%
 *   P4 Research & Development     — 15%
 *
 * Staff KPI: 2 pillars
 *   P1 Attendance & Punctuality   — 50%
 *   P2 Task Completion            — 50%
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type KpiGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface TeacherKpiInput {
  // Pillar 1: Teaching Hours & Attendance (25% weight)
  classesOnTimePct: number;       // % of classes started within 5min of schedule
  teachingHoursVsTarget: number;  // actual / target hours × 100
  teacherPunctualityPct: number;  // % of sessions teacher arrived on time
  leaveUsedPct: number;           // (leave_used / leave_quota) × 100 — lower is better
  classCancellationPct: number;   // % cancelled — lower is better

  // Pillar 2: Student Outcomes (35% weight)
  classPassRatePct: number;       // % students who passed
  studentSatisfactionScore: number; // survey score 0-100
  studentAttendancePct: number;   // avg attendance rate in teacher's classes
  gradeDistributionScore: number; // (A+B students / total) × 100
  remedialStudentsPct: number;    // % needing remedial — lower is better

  // Pillar 3: Administrative Tasks (25% weight)
  markingOnTimePct: number;       // % marking submitted by deadline
  reportsOnTimePct: number;       // % reports submitted on time
  meetingAttendancePct: number;   // % meetings attended
  compliancePct: number;          // % compliance tasks completed
  feedbackResponsePct: number;    // % student feedback responded to

  // Pillar 4: Research & Development (15% weight)
  trainingHoursCompleted: number; // total training hours this period
  trainingHoursTarget: number;    // target (default: 8h/month)
  certifications: number;         // number of certs earned this period
  pdActivities: number;           // professional development activities
  materialsUpdated: number;       // course materials updated (0-10 scale)
  publications: number;           // publications/contributions (0-5 scale)
}

export interface StaffKpiInput {
  // Pillar 1: Attendance & Punctuality (50% weight)
  onTimeCheckInPct: number;       // % of working days checked in on time
  leaveUsedPct: number;           // leave used / quota × 100 — lower is better
  meetingAttendancePct: number;   // % meetings attended

  // Pillar 2: Task Completion (50% weight)
  tasksOnDeadlinePct: number;     // % tasks completed by deadline
  escalationsResolvedPct: number; // % escalations resolved
  qualityScore: number;           // manager rating 0-100
}

export interface KpiPillarResult {
  name: string;
  weight: number;                 // pillar weight as decimal (0.25, 0.35, etc.)
  rawScore: number;               // 0-100
  weightedScore: number;          // rawScore × weight
  breakdown: Record<string, number>; // metric → score
}

export interface TeacherKpiResult {
  pillar1: KpiPillarResult;
  pillar2: KpiPillarResult;
  pillar3: KpiPillarResult;
  pillar4: KpiPillarResult;
  totalScore: number;             // 0-100
  grade: KpiGrade;
  gradeLabel: string;
  strengths: string[];
  improvements: string[];
  periodLabel?: string;
}

export interface StaffKpiResult {
  pillar1: KpiPillarResult;
  pillar2: KpiPillarResult;
  totalScore: number;
  grade: KpiGrade;
  gradeLabel: string;
  periodLabel?: string;
}

// ─── Grade thresholds ─────────────────────────────────────────────────────────

export const GRADE_THRESHOLDS: Array<{ min: number; grade: KpiGrade; label: string }> = [
  { min: 90, grade: 'A', label: 'Excellent' },
  { min: 75, grade: 'B', label: 'Good' },
  { min: 60, grade: 'C', label: 'Satisfactory' },
  { min: 45, grade: 'D', label: 'Needs Improvement' },
  { min: 0,  grade: 'F', label: 'Unsatisfactory' },
];

export function getGrade(score: number): { grade: KpiGrade; label: string } {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.min) return { grade: t.grade, label: t.label };
  }
  return { grade: 'F', label: 'Unsatisfactory' };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Invert a metric where lower is better (e.g. cancellation rate). */
function invertPct(pct: number): number {
  return Math.max(0, 100 - pct);
}

/** Clamp to 0-100 */
function clamp(val: number): number {
  return Math.max(0, Math.min(100, val));
}

/** Normalise a count to a 0-100 score given a target. */
function normalise(actual: number, target: number): number {
  if (target <= 0) return 100;
  return clamp((actual / target) * 100);
}

// ─── Teacher KPI ──────────────────────────────────────────────────────────────

export function calculateTeacherKpi(
  input: TeacherKpiInput,
  periodLabel?: string
): TeacherKpiResult {
  // ── Pillar 1: Teaching Hours & Attendance (25%) ────────────────────────────
  const p1Metrics = {
    'Classes on time': clamp(input.classesOnTimePct),
    'Teaching hours vs target': clamp(input.teachingHoursVsTarget),
    'Punctuality': clamp(input.teacherPunctualityPct),
    'Leave usage (inverted)': invertPct(input.leaveUsedPct),
    'Cancellation rate (inverted)': invertPct(input.classCancellationPct),
  };
  // Weighted within pillar: 25%, 20%, 15%, 10%, 10%
  const p1Weights = [0.35, 0.25, 0.20, 0.10, 0.10];
  const p1Values = Object.values(p1Metrics);
  const p1Raw = p1Values.reduce((acc, v, i) => acc + v * p1Weights[i], 0);
  const pillar1: KpiPillarResult = {
    name: 'Teaching Hours & Attendance',
    weight: 0.25,
    rawScore: parseFloat(p1Raw.toFixed(2)),
    weightedScore: parseFloat((p1Raw * 0.25).toFixed(2)),
    breakdown: p1Metrics,
  };

  // ── Pillar 2: Student Outcomes (35%) ──────────────────────────────────────
  const p2Metrics = {
    'Pass rate': clamp(input.classPassRatePct),
    'Satisfaction score': clamp(input.studentSatisfactionScore),
    'Student attendance': clamp(input.studentAttendancePct),
    'Grade distribution': clamp(input.gradeDistributionScore),
    'Remedial rate (inverted)': invertPct(input.remedialStudentsPct),
  };
  const p2Weights = [0.30, 0.25, 0.20, 0.15, 0.10];
  const p2Values = Object.values(p2Metrics);
  const p2Raw = p2Values.reduce((acc, v, i) => acc + v * p2Weights[i], 0);
  const pillar2: KpiPillarResult = {
    name: 'Student Outcomes',
    weight: 0.35,
    rawScore: parseFloat(p2Raw.toFixed(2)),
    weightedScore: parseFloat((p2Raw * 0.35).toFixed(2)),
    breakdown: p2Metrics,
  };

  // ── Pillar 3: Administrative Tasks (25%) ───────────────────────────────────
  const p3Metrics = {
    'Marking on time': clamp(input.markingOnTimePct),
    'Reports on time': clamp(input.reportsOnTimePct),
    'Meeting attendance': clamp(input.meetingAttendancePct),
    'Compliance tasks': clamp(input.compliancePct),
    'Feedback responses': clamp(input.feedbackResponsePct),
  };
  const p3Weights = [0.30, 0.25, 0.20, 0.15, 0.10];
  const p3Values = Object.values(p3Metrics);
  const p3Raw = p3Values.reduce((acc, v, i) => acc + v * p3Weights[i], 0);
  const pillar3: KpiPillarResult = {
    name: 'Administrative Tasks',
    weight: 0.25,
    rawScore: parseFloat(p3Raw.toFixed(2)),
    weightedScore: parseFloat((p3Raw * 0.25).toFixed(2)),
    breakdown: p3Metrics,
  };

  // ── Pillar 4: Research & Development (15%) ─────────────────────────────────
  const trainingScore = normalise(input.trainingHoursCompleted, input.trainingHoursTarget);
  const certScore = Math.min(100, input.certifications * 25);       // 4+ certs = 100
  const pdScore = Math.min(100, input.pdActivities * 20);           // 5+ activities = 100
  const materialsScore = normalise(input.materialsUpdated, 10);
  const pubScore = Math.min(100, input.publications * 20);          // 5+ = 100

  const p4Metrics = {
    'Training hours': trainingScore,
    'Certifications': certScore,
    'PD activities': pdScore,
    'Materials updated': materialsScore,
    'Publications': pubScore,
  };
  const p4Weights = [0.30, 0.25, 0.20, 0.15, 0.10];
  const p4Values = Object.values(p4Metrics);
  const p4Raw = p4Values.reduce((acc, v, i) => acc + v * p4Weights[i], 0);
  const pillar4: KpiPillarResult = {
    name: 'Research & Development',
    weight: 0.15,
    rawScore: parseFloat(p4Raw.toFixed(2)),
    weightedScore: parseFloat((p4Raw * 0.15).toFixed(2)),
    breakdown: p4Metrics,
  };

  // ── Total & Grade ──────────────────────────────────────────────────────────
  const totalScore = parseFloat(
    (pillar1.weightedScore + pillar2.weightedScore + pillar3.weightedScore + pillar4.weightedScore).toFixed(2)
  );
  const { grade, label: gradeLabel } = getGrade(totalScore);

  // ── Strengths & improvements ───────────────────────────────────────────────
  const pillars = [pillar1, pillar2, pillar3, pillar4];
  const strengths = pillars.filter(p => p.rawScore >= 80).map(p => p.name);
  const improvements = pillars.filter(p => p.rawScore < 60).map(p => p.name);

  return { pillar1, pillar2, pillar3, pillar4, totalScore, grade, gradeLabel, strengths, improvements, periodLabel };
}

// ─── Staff KPI ────────────────────────────────────────────────────────────────

export function calculateStaffKpi(
  input: StaffKpiInput,
  periodLabel?: string
): StaffKpiResult {
  // ── Pillar 1: Attendance & Punctuality (50%) ───────────────────────────────
  const sp1Metrics = {
    'On-time check-in': clamp(input.onTimeCheckInPct),
    'Leave usage (inverted)': invertPct(input.leaveUsedPct),
    'Meeting attendance': clamp(input.meetingAttendancePct),
  };
  const sp1Weights = [0.40, 0.30, 0.30];
  const sp1Values = Object.values(sp1Metrics);
  const sp1Raw = sp1Values.reduce((acc, v, i) => acc + v * sp1Weights[i], 0);
  const pillar1: KpiPillarResult = {
    name: 'Attendance & Punctuality',
    weight: 0.50,
    rawScore: parseFloat(sp1Raw.toFixed(2)),
    weightedScore: parseFloat((sp1Raw * 0.50).toFixed(2)),
    breakdown: sp1Metrics,
  };

  // ── Pillar 2: Task Completion (50%) ────────────────────────────────────────
  const sp2Metrics = {
    'Tasks on deadline': clamp(input.tasksOnDeadlinePct),
    'Escalations resolved': clamp(input.escalationsResolvedPct),
    'Quality score': clamp(input.qualityScore),
  };
  const sp2Weights = [0.40, 0.30, 0.30];
  const sp2Values = Object.values(sp2Metrics);
  const sp2Raw = sp2Values.reduce((acc, v, i) => acc + v * sp2Weights[i], 0);
  const pillar2: KpiPillarResult = {
    name: 'Task Completion',
    weight: 0.50,
    rawScore: parseFloat(sp2Raw.toFixed(2)),
    weightedScore: parseFloat((sp2Raw * 0.50).toFixed(2)),
    breakdown: sp2Metrics,
  };

  const totalScore = parseFloat((pillar1.weightedScore + pillar2.weightedScore).toFixed(2));
  const { grade, label: gradeLabel } = getGrade(totalScore);

  return { pillar1, pillar2, totalScore, grade, gradeLabel, periodLabel };
}

// ─── Utility: format period label ─────────────────────────────────────────────

export function formatPeriodLabel(year: number, month: number): string {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

// ─── Utility: institution KPI summary (for management dashboard) ──────────────

export function summariseTeamKpi(records: TeacherKpiResult[]): {
  average: number;
  gradeDistribution: Record<KpiGrade, number>;
  topPerformerScore: number;
  underperformerCount: number;
} {
  if (records.length === 0) {
    return { average: 0, gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 }, topPerformerScore: 0, underperformerCount: 0 };
  }
  const average = parseFloat(
    (records.reduce((s, r) => s + r.totalScore, 0) / records.length).toFixed(2)
  );
  const gradeDistribution: Record<KpiGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  records.forEach(r => { gradeDistribution[r.grade]++; });
  const topPerformerScore = Math.max(...records.map(r => r.totalScore));
  const underperformerCount = records.filter(r => r.totalScore < 60).length;
  return { average, gradeDistribution, topPerformerScore, underperformerCount };
}
