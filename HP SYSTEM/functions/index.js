// HP System — Cloud Functions (Stage 2: money + trust engine)
// - createPayment           : callable; starts a MoMo/VNPay/ZaloPay checkout
// - momoIpn/vnpayIpn/zalopayCallback : gateway webhooks (verify → mark payment paid)
// - onPaymentPaid           : single settlement trigger (invoice→commission→notify→audit)
// - markOverdueInvoices     : daily scheduled job
// - monthlyCommissionRollup : monthly partner payout summary
// - syncRoleClaim           : keep auth role claim in sync with the users doc
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const FV = admin.firestore.FieldValue;

const momo = require('./lib/momo');
const vnpay = require('./lib/vnpay');
const zalopay = require('./lib/zalopay');
const { settleInvoice } = require('./lib/settle');
const axios = require('axios');

const shortId = () => Math.random().toString(36).slice(2, 10);

// Great-circle distance in metres (for the attendance geofence).
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// ────────────────────────────────────────────────────────────
// createPayment — callable from the app. Creates a pending payment
// doc and returns the gateway URL/deeplink for the chosen method.
// ────────────────────────────────────────────────────────────
exports.createPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  const method = (data && data.method) || 'momo';
  const invoiceId = data && data.invoiceId;
  if (!invoiceId) throw new functions.https.HttpsError('invalid-argument', 'invoiceId required.');

  const invSnap = await db.collection('invoices').doc(invoiceId).get();
  if (!invSnap.exists) throw new functions.https.HttpsError('not-found', 'Invoice not found.');
  const inv = invSnap.data();
  if (inv.status === 'paid') throw new functions.https.HttpsError('failed-precondition', 'Invoice already paid.');

  const amountVND = inv.amount;
  const desc = inv.desc || inv.description || 'Tuition';
  const uid = context.auth.uid;
  const orderId = `HP_${invoiceId}_${shortId()}`;

  // record the pending payment first (source of truth for the webhook lookup)
  const payRef = db.collection('payments').doc();
  await payRef.set({
    invoiceId, studentId: inv.studentId || null, studentUserId: uid,
    guardianId: inv.guardianId || null, amount: amountVND, currency: 'VND',
    method, status: 'pending', gatewayOrderId: orderId, createdAt: FV.serverTimestamp(),
  });

  try {
    if (method === 'vnpay') {
      const url = vnpay.createPaymentUrl({ txnRef: orderId, amountVND, orderInfo: desc, ipAddr: data && data.ipAddr });
      return { paymentId: payRef.id, method, payUrl: url };
    }
    if (method === 'zalopay') {
      const r = await zalopay.createOrder({ appTransId: orderId, appUser: uid, amountVND, description: desc, invoiceId });
      return { paymentId: payRef.id, method, payUrl: r.orderUrl, token: r.zpTransToken };
    }
    // default: momo
    const r = await momo.createPayment({ orderId, amountVND, orderInfo: desc, invoiceId, userId: uid });
    return { paymentId: payRef.id, method: 'momo', payUrl: r.payUrl, deeplink: r.deeplink, qrCodeUrl: r.qrCodeUrl };
  } catch (e) {
    await payRef.update({ status: 'failed', error: String(e.message || e) });
    throw new functions.https.HttpsError('unavailable', 'Gateway error: ' + (e.message || e));
  }
});

// ────────────────────────────────────────────────────────────
// submitCheckIn — the only path that writes an attendance record. Verifies an
// active, unexpired session by OTP, enforces the GPS geofence (when configured),
// records the liveness token, and is idempotent (one record per student/session).
// ────────────────────────────────────────────────────────────
exports.submitCheckIn = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  const otp = data && data.otp;
  if (!otp) throw new functions.https.HttpsError('invalid-argument', 'OTP required.');

  const q = await db.collection('attendanceSessions')
    .where('otpCode', '==', String(otp)).where('isActive', '==', true).limit(1).get();
  if (q.empty) throw new functions.https.HttpsError('not-found', 'Mã điểm danh không hợp lệ hoặc đã hết hạn.');
  const sess = q.docs[0];
  const exp = sess.data().expiresAt;
  if (exp && Number(exp) < Date.now()) throw new functions.https.HttpsError('deadline-exceeded', 'Phiên điểm danh đã hết hạn.');

  // Geofence (only enforced if school coords are configured and the client sent coords)
  const SLAT = parseFloat(process.env.SCHOOL_LAT);
  const SLNG = parseFloat(process.env.SCHOOL_LNG);
  const R = parseFloat(process.env.SCHOOL_RADIUS_METERS || '150');
  const lat = data && data.lat, lng = data && data.lng;
  if (!isNaN(SLAT) && !isNaN(SLNG) && lat != null && lng != null) {
    const dist = haversine(SLAT, SLNG, lat, lng);
    if (dist > R) throw new functions.https.HttpsError('failed-precondition', `Bạn đang ở ${Math.round(dist)}m từ trường (tối đa ${R}m).`);
  }

  // Idempotent: one check-in per student per session
  const dup = await db.collection('attendanceRecords')
    .where('sessionId', '==', sess.id).where('studentId', '==', context.auth.uid).limit(1).get();
  if (!dup.empty) return { ok: true, already: true };

  await db.collection('attendanceRecords').add({
    sessionId: sess.id,
    classId: sess.data().classId || null,
    studentId: context.auth.uid,
    status: 'present',
    method: (data && data.livenessToken) ? 'mobile-face-gps' : 'web-otp',
    location: (lat != null && lng != null) ? { lat, lng } : null,
    livenessToken: (data && data.livenessToken) || null,
    timestamp: FV.serverTimestamp(),
  });
  await db.collection('auditLogs').add({
    actorUid: context.auth.uid, action: 'attendance.checkin',
    detail: 'Session ' + sess.id, createdAt: FV.serverTimestamp(),
  });
  return { ok: true };
});

// ────────────────────────────────────────────────────────────
// Helper: mark a payment paid by its gatewayOrderId (webhook → doc).
// Settlement is performed by the onPaymentPaid trigger below.
// ────────────────────────────────────────────────────────────
async function markPaymentPaid(gatewayOrderId, gatewayTxnId) {
  const q = await db.collection('payments').where('gatewayOrderId', '==', gatewayOrderId).limit(1).get();
  if (q.empty) return null;
  const ref = q.docs[0].ref;
  await ref.update({ status: 'paid', gatewayTxnId: gatewayTxnId || null, paidAt: FV.serverTimestamp() });
  return ref.id;
}

// MoMo IPN (JSON body)
exports.momoIpn = functions.https.onRequest(async (req, res) => {
  const body = req.body || {};
  if (!momo.verifyIpnSignature(body)) { res.status(400).json({ message: 'bad signature' }); return; }
  if (Number(body.resultCode) === 0) await markPaymentPaid(body.orderId, String(body.transId));
  else await db.collection('payments').where('gatewayOrderId', '==', body.orderId).limit(1).get()
    .then((q) => q.empty ? null : q.docs[0].ref.update({ status: 'failed' }));
  res.status(200).json(momo.ackBody(body)); // MoMo requires this exact ack
});

// VNPay IPN (GET query params)
exports.vnpayIpn = functions.https.onRequest(async (req, res) => {
  const params = req.query || {};
  if (!vnpay.verifySignature(params)) { res.status(200).json({ RspCode: '97', Message: 'Invalid signature' }); return; }
  if (params.vnp_ResponseCode === '00') await markPaymentPaid(params.vnp_TxnRef, params.vnp_TransactionNo);
  res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
});

// ZaloPay callback (JSON { data, mac })
exports.zalopayCallback = functions.https.onRequest(async (req, res) => {
  const dataStr = req.body && req.body.data;
  const mac = req.body && req.body.mac;
  if (!dataStr || !zalopay.verifyCallbackMac(dataStr, mac)) {
    res.status(200).json({ return_code: -1, return_message: 'mac not equal' }); return;
  }
  let tx = {};
  try { tx = JSON.parse(dataStr); } catch (_) { /* ignore */ }
  await markPaymentPaid(tx.app_trans_id, String(tx.zp_trans_id || ''));
  res.status(200).json({ return_code: 1, return_message: 'success' });
});

// ────────────────────────────────────────────────────────────
// onPaymentPaid — the single settlement point. Fires when a payment
// document transitions to paid; runs the idempotent money ripple.
// ────────────────────────────────────────────────────────────
exports.onPaymentPaid = functions.firestore
  .document('payments/{id}')
  .onWrite(async (change) => {
    const after = change.after.exists ? change.after.data() : null;
    const before = change.before.exists ? change.before.data() : null;
    if (!after) return null;
    const becamePaid = (after.status === 'paid' || after.status === 'success')
      && (!before || (before.status !== 'paid' && before.status !== 'success'));
    if (!becamePaid || !after.invoiceId) return null;
    await settleInvoice(db, {
      invoiceId: after.invoiceId, paymentId: change.after.id,
      gateway: after.method || 'gateway', gatewayTxnId: after.gatewayTxnId || null,
    });
    return null;
  });

// ────────────────────────────────────────────────────────────
// markOverdueInvoices — daily: flag unpaid invoices past their due date.
// ────────────────────────────────────────────────────────────
exports.markOverdueInvoices = functions.pubsub.schedule('every 24 hours').onRun(async () => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const snap = await db.collection('invoices').where('status', '==', 'pending').get();
  const batch = db.batch();
  let n = 0;
  snap.forEach((d) => {
    const v = d.data();
    const due = v.due || v.dueDate;
    if (due && String(due) < today) {
      batch.update(d.ref, { status: 'overdue' });
      batch.set(db.collection('notifications').doc(), {
        userId: v.studentUserId || v.studentId || 'student', type: 'fee',
        title: 'Fee overdue', body: 'Invoice ' + (v.desc || d.id) + ' is past its due date.',
        read: false, createdAt: FV.serverTimestamp(),
      });
      n++;
    }
  });
  if (n) await batch.commit();
  console.log('markOverdueInvoices: flagged ' + n);
  return null;
});

// ────────────────────────────────────────────────────────────
// monthlyCommissionRollup — 1st of each month: summarize payable
// commissions per partner into a payout doc and notify them.
// ────────────────────────────────────────────────────────────
exports.monthlyCommissionRollup = functions.pubsub.schedule('0 0 1 * *').timeZone('Asia/Ho_Chi_Minh').onRun(async () => {
  const snap = await db.collection('commissions').where('status', '==', 'payable').get();
  const byPartner = {};
  snap.forEach((d) => { const c = d.data(); byPartner[c.partnerId] = (byPartner[c.partnerId] || 0) + (c.amount || 0); });
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const batch = db.batch();
  Object.keys(byPartner).forEach((pid) => {
    batch.set(db.collection('commissionPayouts').doc(`${pid}_${month}`), {
      partnerId: pid, month, amount: byPartner[pid], status: 'scheduled', createdAt: FV.serverTimestamp(),
    }, { merge: true });
    batch.set(db.collection('notifications').doc(), {
      userId: pid, type: 'system', title: 'Commission payout scheduled',
      body: 'Your ' + month + ' commission payout has been scheduled.', read: false, createdAt: FV.serverTimestamp(),
    });
  });
  await batch.commit();
  console.log('monthlyCommissionRollup: partners ' + Object.keys(byPartner).length);
  return null;
});

// ────────────────────────────────────────────────────────────
// syncRoleClaim — keep the auth token's role claim in sync with the
// users doc, so security rules / clients can trust the role.
// ────────────────────────────────────────────────────────────
exports.syncRoleClaim = functions.firestore
  .document('users/{uid}')
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after || !after.role) return null;
    try {
      await admin.auth().setCustomUserClaims(context.params.uid, { role: after.role });
      console.log('syncRoleClaim: ' + context.params.uid + ' → ' + after.role);
    } catch (e) { console.error('syncRoleClaim failed:', e.message); }
    return null;
  });

// ────────────────────────────────────────────────────────────
// sendPushOnNotification — when a notification is written for a user who has a
// mobile push token, deliver it via Expo Push. Ties the mobile app into the
// same notifications fabric the web app already uses.
// ────────────────────────────────────────────────────────────
exports.sendPushOnNotification = functions.firestore
  .document('notifications/{id}')
  .onCreate(async (snap) => {
    const n = snap.data();
    if (!n || !n.userId) return null;
    const uref = await db.collection('users').doc(String(n.userId)).get();
    if (!uref.exists) return null; // role-string targets (e.g. 'admin') have no push token
    const token = uref.data().pushToken;
    if (!token) return null;
    try {
      await axios.post('https://exp.host/--/api/v2/push/send', {
        to: token,
        title: n.title || 'HP System',
        body: n.body || '',
        sound: 'default',
        data: { type: n.type || 'system' },
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 8000 });
    } catch (e) { console.error('push send failed:', e.message); }
    return null;
  });
