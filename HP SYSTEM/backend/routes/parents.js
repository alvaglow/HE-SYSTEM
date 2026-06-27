// routes/parents.js — Parent dashboard endpoints
const express = require('express');
const { param, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();
router.use(authenticate);
router.use(requireRole('parent', 'admin'));

// ── PARENT DASHBOARD ──────────────────────────────────────────

router.get('/dashboard', async (req, res, next) => {
  try {
    const parentId = req.user.userId;
    // Get linked children
    const childrenRes = await query(
      `SELECT s.id, u.full_name, s.grade, s.student_code
       FROM students s JOIN users u ON s.user_id=u.id
       WHERE s.parent_id=$1`, [parentId]
    );
    const children = childrenRes.rows;
    if (children.length === 0) return res.json({ children: [] });

    // For each child, get latest check-in + pending invoices
    const childData = await Promise.all(children.map(async (child) => {
      const [lastCheckIn, pendingFees] = await Promise.all([
        query(
          `SELECT ar.check_in_time, ar.status, s.class_name
           FROM attendance_records ar JOIN attendance_sessions s ON ar.session_id=s.id
           WHERE ar.student_id=$1 ORDER BY ar.check_in_time DESC LIMIT 1`,
          [child.id]
        ),
        query(
          `SELECT SUM(amount_vnd) as total_due, COUNT(*) as count
           FROM invoices WHERE student_id=$1 AND status='pending'`,
          [child.id]
        ),
      ]);
      return {
        ...child,
        lastCheckIn: lastCheckIn.rows[0] || null,
        pendingFees: pendingFees.rows[0] || { total_due: 0, count: 0 },
      };
    }));

    // Auto-pay setting
    const autopayRes = await query(
      `SELECT autopay_enabled, autopay_max_vnd FROM users WHERE id=$1`, [parentId]
    );

    res.json({
      children: childData,
      autopay: autopayRes.rows[0] || { autopay_enabled: false },
    });
  } catch (err) { next(err); }
});

// ── CHILD ATTENDANCE HISTORY ──────────────────────────────────

router.get('/children/:childId/attendance',
  param('childId').isUUID(),
  async (req, res, next) => {
    try {
      // Verify parent-child link
      const link = await query(
        `SELECT id FROM students WHERE id=$1 AND parent_id=$2`,
        [req.params.childId, req.user.userId]
      );
      if (!link.rows[0]) return res.status(403).json({ error: 'Forbidden' });

      const result = await query(
        `SELECT ar.check_in_time, ar.status, s.class_name, ar.distance_meters
         FROM attendance_records ar JOIN attendance_sessions s ON ar.session_id=s.id
         WHERE ar.student_id=$1 ORDER BY ar.check_in_time DESC LIMIT 50`,
        [req.params.childId]
      );
      res.json({ records: result.rows });
    } catch (err) { next(err); }
  }
);

// ── CHILD FEE SUMMARY ─────────────────────────────────────────

router.get('/children/:childId/fees',
  param('childId').isUUID(),
  async (req, res, next) => {
    try {
      const link = await query(
        `SELECT id FROM students WHERE id=$1 AND parent_id=$2`,
        [req.params.childId, req.user.userId]
      );
      if (!link.rows[0]) return res.status(403).json({ error: 'Forbidden' });

      const result = await query(
        `SELECT id, description, amount_vnd, due_date, status, created_at
         FROM invoices WHERE student_id=$1 ORDER BY due_date ASC`,
        [req.params.childId]
      );
      res.json({ invoices: result.rows });
    } catch (err) { next(err); }
  }
);

module.exports = router;
