/**
 * HE-SYSTEM — Teacher + Staff KPI Engine
 * packages/shared/utils/kpi-calculator.ts
 *
 * AUDIT FIX: referenced by package.json exports and index.ts but missing from
 * disk (see commission-formula.ts for the full explanation — same root cause,
 * same fix). Matches the KPI framework documented in the root README:
 *
 *   Teachers (4 pillars): P1 Teaching Hours & Attendance 25%, P2 Student
 *   Outcomes 35%, P3 Administrative Tasks 25%, P4 Research & Development 15%.
 *   Staff (2 pillars): P1 Attendance & Punctuality 50%, P2 Task Completion 50%.
 *   Grades: A (>=90), B (>=75), C (>=60), D (>=45), F (<45).
 *
 * The kpi-calculate edge function has its own simplified inline scoring
 * (server-side, authoritative, runs monthly via CRON) — this file lets the
 * frontend preview/recompute the same weighting without a round trip, and
 * gives both sides one canonical grade boundary definition.
 */
import type { KpiGrade } from '../types/index'

export function getKpiGrade(score: number): KpiGrade {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 45) return 'D'
  return 'F'
}

export interface TeacherKpiInputs {
  /** 0-100: classes actually conducted vs. expected, blended with raw attendance rate */
  teachingHoursAttendanceScore: number
  /** 0-100: student outcomes (exam pass rate, improvement, etc.) */
  studentOutcomesScore: number
  /** 0-100: administrative task completion */
  adminTasksScore: number
  /** 0-100: research & development contribution */
  researchDevelopmentScore: number
}

export interface KpiResult {
  pillars: Record<string, number>
  total: number
  grade: KpiGrade
}

const TEACHER_WEIGHTS = { p1: 0.25, p2: 0.35, p3: 0.25, p4: 0.15 }

export function calculateTeacherKpi(i: TeacherKpiInputs): KpiResult {
  const total =
    i.teachingHoursAttendanceScore * TEACHER_WEIGHTS.p1 +
    i.studentOutcomesScore * TEACHER_WEIGHTS.p2 +
    i.adminTasksScore * TEACHER_WEIGHTS.p3 +
    i.researchDevelopmentScore * TEACHER_WEIGHTS.p4

  return {
    pillars: {
      teachingHoursAttendance: i.teachingHoursAttendanceScore,
      studentOutcomes: i.studentOutcomesScore,
      adminTasks: i.adminTasksScore,
      researchDevelopment: i.researchDevelopmentScore,
    },
    total: Number(total.toFixed(2)),
    grade: getKpiGrade(total),
  }
}

export interface StaffKpiInputs {
  /** 0-100 */
  attendancePunctualityScore: number
  /** 0-100 */
  taskCompletionScore: number
}

const STAFF_WEIGHTS = { p1: 0.5, p2: 0.5 }

export function calculateStaffKpi(i: StaffKpiInputs): KpiResult {
  const total = i.attendancePunctualityScore * STAFF_WEIGHTS.p1 + i.taskCompletionScore * STAFF_WEIGHTS.p2
  return {
    pillars: {
      attendancePunctuality: i.attendancePunctualityScore,
      taskCompletion: i.taskCompletionScore,
    },
    total: Number(total.toFixed(2)),
    grade: getKpiGrade(total),
  }
}
