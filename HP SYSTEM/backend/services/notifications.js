// services/notifications.js — FCM push + Zalo OA within 5 seconds
const admin = require('firebase-admin');
const axios  = require('axios');
const { query } = require('../config/database');
const logger = require('../config/logger');

// Initialize Firebase Admin (for FCM)
let fcmInitialized = false;
const initFCM = () => {
  if (fcmInitialized || process.env.NODE_ENV === 'test') return;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FCM_PROJECT_ID,
      privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FCM_CLIENT_EMAIL,
    }),
  });
  fcmInitialized = true;
};

// ── FCM PUSH NOTIFICATION ─────────────────────────────────────

const sendPush = async (userId, title, body, data = {}) => {
  try {
    initFCM();
    const tokenRes = await query(
      `SELECT fcm_token FROM user_devices WHERE user_id=$1 AND fcm_token IS NOT NULL AND is_active=TRUE`,
      [userId]
    );
    if (tokenRes.rows.length === 0) return;

    const tokens = tokenRes.rows.map(r => r.fcm_token);
    const message = {
      notification: { title, body },
      data: { ...data, timestamp: new Date().toISOString() },
      android: { priority: 'high', notification: { channelId: 'attendance' } },
      apns: { payload: { aps: { alert: { title, body }, badge: 1, sound: 'default' } } },
    };

    await Promise.all(tokens.map(token =>
      admin.messaging().send({ ...message, token }).catch(err =>
        logger.warn(`[FCM] Token ${token.slice(-4)} failed:`, err.message)
      )
    ));
  } catch (err) {
    logger.error('[FCM] Push error:', err.message);
  }
};

// ── ZALO OA NOTIFICATION ──────────────────────────────────────

const sendZaloOA = async (zaloId, templateId, templateData) => {
  try {
    const res = await axios.post(
      'https://openapi.zalo.me/v2.0/oa/message/template',
      {
        recipient: { user_id: zaloId },
        message: { attachment: { type: 'template', payload: { template_id: templateId, template_data: templateData } } },
      },
      {
        headers: {
          'access_token': process.env.ZALO_OA_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );
    return res.data;
  } catch (err) {
    logger.warn('[Zalo OA] Error:', err.message);
  }
};

// ── ATTENDANCE CHECK-IN NOTIFICATION (< 5 seconds SLA) ────────

const notifyAttendance = async (studentId, sessionInfo, status) => {
  const start = Date.now();

  // Get student + parents in parallel
  const [studentRes, parentsRes] = await Promise.all([
    query(`SELECT u.id, u.full_name, ud.fcm_token, up.zalo_id
           FROM users u
           LEFT JOIN user_devices ud ON ud.user_id=u.id AND ud.is_active=TRUE
           LEFT JOIN user_pii up ON up.user_id=u.id
           WHERE u.id=$1`, [studentId]),
    query(`SELECT u.id, u.full_name, ud.fcm_token, up.zalo_id, up.phone
           FROM users u
           JOIN students s ON s.parent_id=u.id
           LEFT JOIN user_devices ud ON ud.user_id=u.id AND ud.is_active=TRUE
           LEFT JOIN user_pii up ON up.user_id=u.id
           WHERE s.id=$1`, [studentId]),
  ]);

  const student = studentRes.rows[0];
  const parents = parentsRes.rows;

  const studentName = student?.full_name || 'Student';
  const statusText  = status === 'present' ? 'đã điểm danh' : 'vắng mặt';
  const title = `HP System - Điểm danh`;
  const body  = `${studentName} ${statusText} lúc ${new Date().toLocaleTimeString('vi-VN')} - ${sessionInfo.className}`;

  const tasks = [
    // Notify student
    studentId && sendPush(studentId, title, body, { type: 'attendance', status }),
    // Notify all parents
    ...parents.map(parent => [
      sendPush(parent.id, title, body, { type: 'attendance', status, studentId }),
      parent.zalo_id && sendZaloOA(parent.zalo_id, process.env.ZALO_ATTENDANCE_TEMPLATE_ID, {
        student_name: studentName,
        status: statusText,
        time: new Date().toLocaleTimeString('vi-VN'),
        class: sessionInfo.className,
      }),
    ].filter(Boolean)),
  ].filter(Boolean).flat();

  // Fire all in parallel — must complete within 5 second budget
  await Promise.allSettled(tasks);

  const elapsed = Date.now() - start;
  logger.info(`[Notify] Attendance notification sent in ${elapsed}ms (SLA: 5000ms)`);
  if (elapsed > 5000) logger.warn('[Notify] Attendance notification EXCEEDED 5 second SLA');
};

// ── PAYMENT NOTIFICATION ──────────────────────────────────────

const notifyPayment = async (userId, amountVND, status, gateway) => {
  const statusText = status === 'success' ? 'thành công' : 'thất bại';
  const amount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountVND);
  await sendPush(userId,
    'HP System - Thanh toán',
    `Thanh toán ${amount} qua ${gateway.toUpperCase()} ${statusText}`,
    { type: 'payment', status, amountVND: String(amountVND), gateway }
  );
};

module.exports = { sendPush, sendZaloOA, notifyAttendance, notifyPayment };
