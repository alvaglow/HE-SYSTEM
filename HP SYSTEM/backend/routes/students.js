// routes/students.js — Student management endpoints
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const { savePII, readPII, maskPhone } = require('../middleware/encryption');
const { logEvent } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate);
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// ── LIST STUDENTS (admin/teacher) ─────────────────────────────

router.get('/', requireRole('teacher', 'admin', 'management'), async (req, res, next) => {
  try {
    const { classId, search } = req.query;
    let sql = `SELECT s.id, u.full_name, u.email, s.student_code, s.grade, s.class_id, u.is_active
               FROM students s JOIN users u ON s.user_id=u.id WHERE 1=1`;
    const params = [];
    if (classId) sql += ` AND s.class_id=$${params.push(classId)}`;
    if (search)  sql += ` AND (u.full_name ILIKE $${params.push('%'+search+'%')} OR s.student_code ILIKE $${params.length})`;
    sql += ' ORDER BY u.full_name ASC LIMIT 100';
    const result = await query(sql, params, req.user.userId);
    res.json({ students: result.rows });
  } catch (err) { next(err); }
});

// ── GET SINGLE STUDENT ────────────────────────────────────────

router.get('/:studentId',
  requireRole('teacher', 'admin', 'management', 'parent'),
  param('studentId').isUUID(),
  validate,
  async (req, res, next) => {
    try {
      const { studentId } = req.params;
      // Parents: verify it's their child
      if (req.user.role === 'parent' && req.user.childStudentId !== studentId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const result = await query(
        `SELECT s.id, u.full_name, s.student_code, s.grade,
                COUNT(ar.id) FILTER (WHERE ar.status='present') AS present_count,
                COUNT(ar.id) AS total_sessions
         FROM students s JOIN users u ON s.user_id=u.id
         LEFT JOIN attendance_records ar ON ar.student_id=s.id
         WHERE s.id=$1 GROUP BY s.id, u.full_name, s.student_code, s.grade`,
        [studentId], req.user.userId
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      // Return masked PII
      const pii = await readPII(result.rows[0].user_id || studentId);
      res.json({ student: { ...result.rows[0], phone: maskPhone(pii?.phone) } });
    } catch (err) { next(err); }
  }
);

// ── STUDENT DASHBOARD DATA ────────────────────────────────────

router.get('/:studentId/dashboard',
  requireRole('student', 'parent', 'admin'),
  param('studentId').isUUID(),
  validate,
  async (req, res, next) => {
    try {
      const { studentId } = req.params;
      if (req.user.role === 'student' && req.user.userId !== studentId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const [attendanceRes, gradesRes, invoicesRes, nextClassRes] = await Promise.all([
        // Attendance summary (last 30 days)
        query(
          `SELECT status, COUNT(*) as count FROM attendance_records
           WHERE student_id=$1 AND check_in_time > NOW()-INTERVAL '30 days'
           GROUP BY status`,
          [studentId]
        ),
        // Recent grades
        query(
          `SELECT subject, grade_value, grade_type, recorded_at FROM grades
           WHERE student_id=$1 ORDER BY recorded_at DESC LIMIT 5`,
          [studentId]
        ),
        // Outstanding invoices
        query(
          `SELECT id, description, amount_vnd, due_date, status FROM invoices
           WHERE student_id=$1 AND status='pending' ORDER BY due_date ASC LIMIT 3`,
          [studentId]
        ),
        // Next class
        query(
          `SELECT c.name, c.room, t.start_time FROM timetable t
           JOIN classes c ON t.class_id=c.id
           JOIN class_enrollments e ON e.class_id=c.id
           WHERE e.student_id=$1 AND t.start_time > NOW()
           ORDER BY t.start_time ASC LIMIT 1`,
          [studentId]
        ),
      ]);

      res.json({
        attendance: attendanceRes.rows,
        recentGrades: gradesRes.rows,
        pendingInvoices: invoicesRes.rows,
        nextClass: nextClassRes.rows[0] || null,
      });
    } catch (err) { next(err); }
  }
);

// ── GRADE ENTRY (teacher) ─────────────────────────────────────

router.post('/:studentId/grades',
  requireRole('teacher', 'admin'),
  [
    param('studentId').isUUID(),
    body('subject').trim().isLength({ min: 1 }),
    body('gradeValue').isFloat({ min: 0, max: 10 }),
    body('gradeType').isIn(['midterm', 'final', 'assignment', 'quiz']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { subject, gradeValue, gradeType } = req.body;
      await query(
        `INSERT INTO grades(student_id, teacher_id, subject, grade_value, grade_type, recorded_at)
         VALUES($1,$2,$3,$4,$5,NOW())`,
        [req.params.studentId, req.user.userId, subject, gradeValue, gradeType]
      );
      await logEvent('grades.entry', {
        userId: req.user.userId, action: 'grades.entry',
        resourceType: 'grade', resourceId: req.params.studentId,
        metadata: { subject, gradeType },
      });
      res.status(201).json({ success: true });
    } catch (err) { next(err); }
  }
);

module.exports = router;
