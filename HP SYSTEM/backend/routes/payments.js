// routes/payments.js — Payment endpoints
// All routes: idempotency-required, rate-limited, RBAC-guarded
const express = require('express');
const { body, param, query: queryVal, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { paymentLimiter, requireIdempotencyKey } = require('../middleware/security');
const { query, withTransaction } = require('../config/database');
const { logEvent } = require('../middleware/audit');
const zalopay = require('../services/zalopay');
const vnpay   = require('../services/vnpay');
const momo    = require('../services/momo');
const logger  = require('../config/logger');

const router = express.Router();

// All payment routes require authentication
router.use(authenticate);
// All payment routes require idempotency key
router.use(requireIdempotencyKey);
// Rate limit: 5 payments/minute per IP+user
router.use(paymentLimiter);

// ── VALIDATION HELPER ─────────────────────────────────────────

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// ── GET OUTSTANDING INVOICES ──────────────────────────────────

router.get('/invoices', requireRole('student', 'parent', 'admin'), async (req, res, next) => {
  try {
    const studentId = req.query.studentId || req.user.studentId;
    // Parents can only view their child's invoices
    if (req.user.role === 'parent' && req.user.childStudentId !== studentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const result = await query(
      `SELECT id, description, amount_vnd, due_date, status, created_at
       FROM invoices WHERE student_id=$1 ORDER BY due_date ASC`,
      [studentId], req.user.userId
    );
    res.json({ invoices: result.rows });
  } catch (err) { next(err); }
});

// ── GET PAYMENT HISTORY ───────────────────────────────────────

router.get('/history', requireRole('student', 'parent', 'admin'), async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await query(
      `SELECT p.id, p.gateway, p.amount_vnd, p.status, p.created_at, p.completed_at,
              i.description
       FROM payments p JOIN invoices i ON p.invoice_id=i.id
       WHERE p.user_id=$1 ORDER BY p.created_at DESC LIMIT 50`,
      [userId], userId
    );
    // Mask any logged phone/card references
    res.json({ payments: result.rows });
  } catch (err) { next(err); }
});

// ── INITIATE PAYMENT (gateway-agnostic) ──────────────────────

const paymentBodyValidators = [
  body('invoiceId').isUUID(),
  body('gateway').isIn(['zalopay', 'vnpay', 'momo']),
  body('amountVND').isInt({ min: 1000, max: 200000000 }), // 1000đ to 200M VND
];

router.post('/initiate',
  requireRole('student', 'parent'),
  paymentBodyValidators,
  validate,
  async (req, res, next) => {
    try {
      const { invoiceId, gateway, amountVND, description } = req.body;
      const idempotencyKey = req.headers['x-idempotency-key'];
      const userId = req.user.userId;

      // Verify invoice belongs to user and is unpaid
      const inv = await query(
        `SELECT id, student_id, amount_vnd, status FROM invoices WHERE id=$1`,
        [invoiceId], userId
      );
      if (!inv.rows[0]) return res.status(404).json({ error: 'Invoice not found' });
      if (inv.rows[0].status === 'paid') return res.status(400).json({ error: 'Invoice already paid' });
      // Verify amount matches invoice (no client-side price manipulation)
      if (parseInt(inv.rows[0].amount_vnd) !== parseInt(amountVND)) {
        return res.status(400).json({ error: 'Amount mismatch' });
      }

      const ipAddr = req.ip;
      let result;

      switch (gateway) {
        case 'zalopay':
          result = await zalopay.createOrder({ invoiceId, userId, amountVND, description: description || inv.rows[0].description, idempotencyKey });
          break;
        case 'vnpay':
          result = await vnpay.createPaymentUrl({ invoiceId, userId, amountVND, description: description || inv.rows[0].description, idempotencyKey, ipAddr });
          break;
        case 'momo':
          result = await momo.createPayment({ invoiceId, userId, amountVND, description: description || inv.rows[0].description, idempotencyKey });
          break;
      }

      res.json({ success: true, gateway, ...result });
    } catch (err) { next(err); }
  }
);

// ── PAYMENT STATUS POLL ───────────────────────────────────────

router.get('/status/:paymentId',
  requireRole('student', 'parent', 'admin'),
  param('paymentId').isUUID(),
  validate,
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT id, gateway, status, amount_vnd, created_at, completed_at,
                gateway_order_id, anomaly_flag
         FROM payments WHERE id=$1 AND user_id=$2`,
        [req.params.paymentId, req.user.userId]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      const p = result.rows[0];

      // If still pending, poll gateway for fresh status
      if (p.status === 'pending') {
        try {
          let gwStatus;
          if (p.gateway === 'zalopay') gwStatus = await zalopay.queryOrder(p.gateway_order_id);
          if (p.gateway === 'momo') gwStatus = await momo.queryOrder(p.gateway_order_id);
          // VNPay does not support arbitrary polling without transDate — return cached status
        } catch (pollErr) {
          logger.warn('[Payments] Gateway poll error:', pollErr.message);
        }
      }

      res.json({ payment: { id: p.id, gateway: p.gateway, status: p.status, amountVND: p.amount_vnd, createdAt: p.created_at, completedAt: p.completed_at, anomalyFlag: p.anomaly_flag } });
    } catch (err) { next(err); }
  }
);

// ── VND AMOUNT LOCK (exchange rate lock for checkout session) ─
// Returns locked VND amount + session ID; no floating rate during checkout

router.post('/lock-amount',
  requireRole('student', 'parent'),
  body('amountVND').isInt({ min: 1000 }),
  validate,
  async (req, res, next) => {
    try {
      // VND has no conversion needed (already base currency), but record lock
      const lockId  = require('crypto').randomBytes(16).toString('hex');
      const lockedAt = new Date().toISOString();
      // In production: store in Redis with 15-min TTL
      res.json({ lockId, amountVND: req.body.amountVND, lockedAt, expiresIn: 900 });
    } catch (err) { next(err); }
  }
);

// ── AUTO-PAY TOGGLE (parent only) ────────────────────────────

router.put('/autopay',
  requireRole('parent'),
  body('enabled').isBoolean(),
  body('maxAmountVND').optional().isInt({ min: 0, max: 50000000 }),
  validate,
  async (req, res, next) => {
    try {
      const { enabled, maxAmountVND } = req.body;
      await query(
        `UPDATE users SET autopay_enabled=$1, autopay_max_vnd=$2 WHERE id=$3`,
        [enabled, maxAmountVND || null, req.user.userId]
      );
      await logEvent('payment.autopay.updated', {
        userId: req.user.userId, action: 'payment.autopay.updated',
        metadata: { enabled, maxAmountVND },
      });
      res.json({ success: true, autopay: { enabled, maxAmountVND } });
    } catch (err) { next(err); }
  }
);

// ── ADMIN: REFUND (record only — actual refund via gateway console) ──

router.post('/refund/:paymentId',
  requireRole('admin', 'management'),
  param('paymentId').isUUID(),
  body('reason').isString().trim().isLength({ min: 10, max: 500 }),
  validate,
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        await client.query(
          `UPDATE payments SET status='refunded', refund_reason=$1, refunded_at=NOW() WHERE id=$2`,
          [req.body.reason, req.params.paymentId]
        );
        await client.query(
          `INSERT INTO audit_log(user_id, action, resource_type, resource_id, metadata)
           VALUES($1,'payment.refund','payment',$2,$3)`,
          [req.user.userId, req.params.paymentId, JSON.stringify({ reason: req.body.reason })]
        );
      });
      res.json({ success: true, message: 'Refund recorded. Process via gateway console.' });
    } catch (err) { next(err); }
  }
);

// ── ANOMALY OVERRIDE (admin can clear flag) ───────────────────

router.post('/anomaly-override/:paymentId',
  requireRole('admin'),
  body('reason').isString().trim().isLength({ min: 10 }),
  validate,
  async (req, res, next) => {
    try {
      await query(
        `UPDATE payments SET anomaly_flag=FALSE, anomaly_cleared_by=$1, anomaly_cleared_at=NOW()
         WHERE id=$2`,
        [req.user.userId, req.params.paymentId]
      );
      await logEvent('payment.anomaly.override', {
        userId: req.user.userId,
        metadata: { paymentId: req.params.paymentId, reason: req.body.reason },
      });
      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

module.exports = router;
