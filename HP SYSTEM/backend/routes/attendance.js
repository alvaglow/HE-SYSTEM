// routes/attendance.js — Check-in with liveness, GPS, offline queue, Merkle
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { attendanceLimiter } = require('../middleware/security');
const { query, withTransaction } = require('../config/database');
const { logEvent } = require('../middleware/audit');
const { notifyAttendance } = require('../services/notifications');
const { buildDailyTree, generateProof } = require('../services/merkle');
const logger = require('../config/logger');

const router = express.Router();
router.use(authenticate);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// ── SCHOOL GEOFENCE (from .env) ───────────────────────────────

const SCHOOL_LAT  = parseFloat(process.env.SCHOOL_LAT  || '10.7769');
const SCHOOL_LNG  = parseFloat(process.env.SCHOOL_LNG  || '106.7009');
const FENCE_RADIUS_M = parseInt(process.env.GEOFENCE_RADIUS_M || '100');

const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// ── LIVENESS VERIFICATION ─────────────────────────────────────
// The mobile app performs on-device liveness detection and sends
// a signed liveness token. We verify the HMAC signature server-side.

const crypto = require('crypto');
const verifyLivenessToken = (token, timestamp) => {
  if (!token) return false;
  // Token must be < 30 seconds old
  if (Date.now() - timestamp > 30000) return false;
  // Verify HMAC-SHA256 of `${userId}:${timestamp}:liveness`
  // (Mobile SDK signs with shared LIVENESS_SECRET — never sent to client)
  const [userId, ts, hmac] = token.split('.');
  const expected = crypto
    .createHmac('sha256', process.env.LIVENESS_SECRET)
    .update(`${userId}:${ts}:liveness`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hmac, 'hex'));
  } catch { return false; }
};

// ── STUDENT CHECK-IN ──────────────────────────────────────────
// Rate limited: 10 check-ins/hour per user

router.post('/checkin',
  requireRole('student'),
  attendanceLimiter,
  [
    body('sessionId').isUUID(),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('livenessToken').isString().notEmpty(),
    body('livenessTimestamp').isInt(),
    body('offlineQueueId').optional().isUUID(), // for offline submissions
  ],
  validate,
  async (req, res, next) => {
    const startMs = Date.now();
    try {
      const { sessionId, latitude, longitude, livenessToken, livenessTimestamp, offlineQueueId } = req.body;
      const studentId = req.user.userId;

      // 1. Verify liveness (anti-spoofing) — MUST be first
      if (!verifyLivenessToken(livenessToken, livenessTimestamp)) {
        await logEvent('attendance.liveness.failed', {
          userId: studentId, action: 'attendance.liveness.failed',
          metadata: { sessionId },
        });
        return res.status(400).json({ error: 'Liveness verification failed', code: 'LIVENESS_FAILED' });
      }

      // 2. GPS geofence check
      const distanceMeters = haversineMeters(latitude, longitude, SCHOOL_LAT, SCHOOL_LNG);
      const withinFence = distanceMeters <= FENCE_RADIUS_M;
      if (!withinFence) {
        await logEvent('attendance.geofence.failed', {
          userId: studentId, action: 'attendance.geofence.failed',
          metadata: { sessionId, distanceMeters: Math.round(distanceMeters), fenceRadius: FENCE_RADIUS_M },
        });
        return res.status(400).json({
          error: `Location outside school zone (${Math.round(distanceMeters)}m away, max ${FENCE_RADIUS_M}m)`,
          code: 'OUTSIDE_GEOFENCE',
          distanceMeters: Math.round(distanceMeters),
        });
      }

      // 3. Verify session is active
      const sessionRes = await query(
        `SELECT id, class_id, teacher_id, is_active, class_name, start_time
         FROM attendance_sessions WHERE id=$1`,
        [sessionId]
      );
      if (!sessionRes.rows[0]) return res.status(404).json({ error: 'Session not found' });
      if (!sessionRes.rows[0].is_active) return res.status(400).json({ error: 'Session closed', code: 'SESSION_CLOSED' });

      // 4. Check for duplicate check-in
      const dup = await query(
        `SELECT id FROM attendance_records WHERE student_id=$1 AND session_id=$2`,
        [studentId, sessionId]
      );
      if (dup.rows[0]) return res.status(409).json({ error: 'Already checked in', code: 'DUPLICATE' });

      // 5. Record attendance
      const record = await withTransaction(async (client) => {
        const ins = await client.query(
          `INSERT INTO attendance_records(student_id, session_id, check_in_time, status,
             latitude, longitude, distance_meters, liveness_verified, offline_queue_id)
           VALUES($1,$2,NOW(),'present',$3,$4,$5,TRUE,$6) RETURNING id, check_in_time`,
          [studentId, sessionId, latitude, longitude, Math.round(distanceMeters), offlineQueueId || null]
        );
        return ins.rows[0];
      });

      // 6. Notify parent within 5 seconds (fire and forget)
      notifyAttendance(studentId, {
        className: sessionRes.rows[0].class_name,
        sessionId,
      }, 'present').catch(err => logger.warn('[Attendance] Notify error:', err.message));

      // 7. Audit log
      await logEvent('attendance.checkin', {
        userId: studentId, action: 'attendance.checkin',
        resourceType: 'attendance', resourceId: record.id,
        metadata: { sessionId, distanceMeters: Math.round(distanceMeters), livenessVerified: true },
      });

      const elapsed = Date.now() - startMs;
      logger.info(`[Attendance] Check-in complete in ${elapsed}ms (SLA: 2000ms)`);
      if (elapsed > 2000) logger.warn('[Attendance] Check-in EXCEEDED 2 second SLA');

      res.json({
        success: true,
        recordId: record.id,
        checkInTime: record.check_in_time,
        distanceMeters: Math.round(distanceMeters),
        elapsedMs: elapsed,
      });
    } catch (err) { next(err); }
  }
);

// ── TEACHER: OPEN SESSION ─────────────────────────────────────

router.post('/sessions',
  requireRole('teacher', 'admin'),
  [
    body('classId').isUUID(),
    body('className').trim().isLength({ min: 1, max: 100 }),
    body('durationMinutes').isInt({ min: 15, max: 240 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { classId, className, durationMinutes } = req.body;
      const res2 = await query(
        `INSERT INTO attendance_sessions(class_id, teacher_id, class_name, is_active,
           start_time, end_time)
         VALUES($1,$2,$3,TRUE,NOW(),NOW()+$4::interval) RETURNING id, start_time`,
        [classId, req.user.userId, className, `${durationMinutes} minutes`]
      );
      res.status(201).json({ session: res2.rows[0] });
    } catch (err) { next(err); }
  }
);

// ── TEACHER: CLOSE SESSION ────────────────────────────────────

router.put('/sessions/:sessionId/close',
  requireRole('teacher', 'admin'),
  param('sessionId').isUUID(),
  validate,
  async (req, res, next) => {
    try {
      await query(
        `UPDATE attendance_sessions SET is_active=FALSE, closed_at=NOW()
         WHERE id=$1 AND teacher_id=$2`,
        [req.params.sessionId, req.user.userId]
      );
      // Mark absent students
      await query(
        `INSERT INTO attendance_records(student_id, session_id, check_in_time, status, liveness_verified)
         SELECT e.student_id, $1, NOW(), 'absent', FALSE
         FROM class_enrollments e
         WHERE e.class_id=(SELECT class_id FROM attendance_sessions WHERE id=$1)
           AND e.student_id NOT IN (SELECT student_id FROM attendance_records WHERE session_id=$1)`,
        [req.params.sessionId]
      );
      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

// ── GET ATTENDANCE RECORDS ────────────────────────────────────

router.get('/records',
  requireRole('student', 'teacher', 'admin', 'parent'),
  async (req, res, next) => {
    try {
      const { studentId, sessionId, date } = req.query;
      // Students/parents can only see own data
      const effectiveStudentId = (req.user.role === 'student')
        ? req.user.userId
        : (req.user.role === 'parent' ? req.user.childStudentId : studentId);

      let sql = `SELECT ar.id, ar.student_id, ar.session_id, ar.check_in_time,
                        ar.status, ar.distance_meters, s.class_name
                 FROM attendance_records ar JOIN attendance_sessions s ON ar.session_id=s.id
                 WHERE 1=1`;
      const params = [];
      if (effectiveStudentId) { sql += ` AND ar.student_id=$${params.push(effectiveStudentId)}`; }
      if (sessionId)          { sql += ` AND ar.session_id=$${params.push(sessionId)}`; }
      if (date)               { sql += ` AND DATE(ar.check_in_time)=$${params.push(date)}`; }
      sql += ' ORDER BY ar.check_in_time DESC LIMIT 100';

      const result = await query(sql, params, req.user.userId);
      res.json({ records: result.rows });
    } catch (err) { next(err); }
  }
);

// ── GET MERKLE PROOF (tamper-proof verification) ──────────────

router.get('/proof/:attendanceId',
  requireRole('student', 'teacher', 'admin', 'parent', 'management'),
  param('attendanceId').isUUID(),
  validate,
  async (req, res, next) => {
    try {
      const proof = await generateProof(req.params.attendanceId);
      res.json({ proof });
    } catch (err) { next(err); }
  }
);

// ── TRIGGER DAILY MERKLE BUILD (admin/cron) ───────────────────

router.post('/merkle/build',
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { date } = req.body;
      const result = await buildDailyTree(date);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  }
);

// ── OFFLINE QUEUE FLUSH ───────────────────────────────────────
// Mobile sends queued check-ins when connectivity is restored

router.post('/flush-offline',
  requireRole('student'),
  [body('queue').isArray({ min: 1, max: 50 })],
  validate,
  async (req, res, next) => {
    try {
      const results = [];
      for (const item of req.body.queue) {
        try {
          // Re-submit each item as if it came in online (liveness still required)
          const mockReq = {
            body: item,
            user: req.user,
            ip: req.ip,
          };
          // Check time validity: offline items must be < 24 hours old
          if (Date.now() - item.capturedAt > 86400000) {
            results.push({ queueId: item.offlineQueueId, status: 'expired' });
            continue;
          }
          // Re-verify liveness (offline token was generated at capture time)
          if (!verifyLivenessToken(item.livenessToken, item.livenessTimestamp)) {
            results.push({ queueId: item.offlineQueueId, status: 'liveness_failed' });
            continue;
          }
          // Check duplicate
          const dup = await query(
            `SELECT id FROM attendance_records WHERE student_id=$1 AND session_id=$2`,
            [req.user.userId, item.sessionId]
          );
          if (dup.rows[0]) { results.push({ queueId: item.offlineQueueId, status: 'duplicate' }); continue; }

          await query(
            `INSERT INTO attendance_records(student_id, session_id, check_in_time, status,
               latitude, longitude, distance_meters, liveness_verified, offline_queue_id)
             VALUES($1,$2,$3,'present',$4,$5,$6,TRUE,$7)`,
            [req.user.userId, item.sessionId, new Date(item.capturedAt),
             item.latitude, item.longitude,
             Math.round(haversineMeters(item.latitude, item.longitude, SCHOOL_LAT, SCHOOL_LNG)),
             item.offlineQueueId]
          );
          results.push({ queueId: item.offlineQueueId, status: 'success' });
        } catch (itemErr) {
          results.push({ queueId: item.offlineQueueId, status: 'error', message: itemErr.message });
        }
      }
      res.json({ results });
    } catch (err) { next(err); }
  }
);

module.exports = router;
