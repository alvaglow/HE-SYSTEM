/**
 * HE-SYSTEM — CGPA Calculator
 * packages/shared/utils/gpa-calculator.ts
 *
 * Computes a cumulative grade-point average from published exam_results,
 * weighted by each subject's credit_hours. This is HE-SYSTEM's own design —
 * not copied from any third-party institution's system — using the common
 * 4.0-scale letter-grade mapping used by most Malaysian private universities.
 *
 * Convention: a subject's "final" grade is whichever of its published
 * exam_results rows has assessment_type containing "final" (case-insensitive).
 * If a subject has no such row yet, it's excluded from the GPA (still in
 * progress) rather than guessed from a partial assessment.
 */

const GRADE_POINTS: Record<string, number> = {
  'A+': 4.0, A: 4.0, 'A-': 3.67,
  'B+': 3.33, B: 3.0, 'B-': 2.67,
  'C+': 2.33, C: 2.0, 'C-': 1.67,
  'D+': 1.33, D: 1.0,
  F: 0.0,
}

/** Ordered list of valid letter grades, for building grade-select dropdowns (e.g. the GPA what-if predictor). */
export const GRADE_OPTIONS: string[] = Object.keys(GRADE_POINTS)

export function gradeToPoint(grade: string | null | undefined): number | null {
  if (!grade) return null
  const normalized = grade.trim().toUpperCase()
  return normalized in GRADE_POINTS ? GRADE_POINTS[normalized] : null
}

export interface SubjectGradeInput {
  subjectId: string
  subjectName: string
  subjectCode?: string | null
  creditHours: number
  grade: string | null
  assessmentType?: string | null
  examDate?: string | null
}

export interface SubjectGpaRow {
  subjectId: string
  subjectName: string
  subjectCode?: string | null
  creditHours: number
  grade: string
  gradePoint: number
}

export interface CgpaResult {
  cgpa: number | null
  totalCreditHours: number
  subjects: SubjectGpaRow[]
}

/**
 * Takes every published exam_results row (joined with subject credit_hours)
 * for a student, picks the "final" assessment per subject (most recent one
 * if there are duplicates), and computes a credit-weighted CGPA.
 */
export function calculateCgpa(rows: SubjectGradeInput[]): CgpaResult {
  const finalsBySubject = new Map<string, SubjectGradeInput>()

  for (const row of rows) {
    const isFinal = (row.assessmentType ?? '').toLowerCase().includes('final')
    if (!isFinal || !row.grade) continue
    const existing = finalsBySubject.get(row.subjectId)
    if (!existing || (row.examDate ?? '') > (existing.examDate ?? '')) {
      finalsBySubject.set(row.subjectId, row)
    }
  }

  const subjects: SubjectGpaRow[] = []
  for (const row of finalsBySubject.values()) {
    const point = gradeToPoint(row.grade)
    if (point === null) continue
    subjects.push({
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      subjectCode: row.subjectCode,
      creditHours: row.creditHours,
      grade: row.grade!.trim().toUpperCase(),
      gradePoint: point,
    })
  }

  const totalCreditHours = subjects.reduce((sum, s) => sum + s.creditHours, 0)
  const weightedSum = subjects.reduce((sum, s) => sum + s.gradePoint * s.creditHours, 0)

  return {
    cgpa: totalCreditHours > 0 ? Number((weightedSum / totalCreditHours).toFixed(2)) : null,
    totalCreditHours,
    subjects: subjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
  }
}
