// lib/settle.js — the money ripple, server-side and idempotent.
// When a payment succeeds: mark the invoice paid, flip the referring partner's
// commission to payable, notify the student, and append an audit entry.
// Management's revenue/finance views derive from these collections, so they
// update automatically.
const admin = require('firebase-admin');

const FV = admin.firestore.FieldValue;

/**
 * Settle a paid invoice. Safe to call more than once (no-ops if already paid).
 * @param {FirebaseFirestore.Firestore} db
 * @param {object} p { invoiceId, paymentId?, gateway?, gatewayTxnId? }
 */
async function settleInvoice(db, p) {
  const { invoiceId, paymentId = null, gateway = 'gateway', gatewayTxnId = null } = p;
  if (!invoiceId) throw new Error('settleInvoice: invoiceId required');

  // Phase 1 — atomically flip the invoice (idempotency guard inside the txn)
  const invRef = db.collection('invoices').doc(invoiceId);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(invRef);
    if (!snap.exists) throw new Error('invoice not found: ' + invoiceId);
    const inv = snap.data();
    if (inv.status === 'paid') return { already: true, inv };
    tx.update(invRef, {
      status: 'paid',
      paidAt: FV.serverTimestamp(),
      paymentId,
      settledVia: gateway,
    });
    return { already: false, inv };
  });

  if (result.already) return { ok: true, already: true };
  const inv = result.inv;

  // Phase 2 — ripple (outside the txn; each piece is its own write)
  const batch = db.batch();

  // a) flip the referring partner's pending commission(s) for this student
  let commissionsFlipped = 0;
  if (inv.studentId) {
    const cs = await db.collection('commissions')
      .where('studentId', '==', inv.studentId)
      .where('status', '==', 'pending')
      .get();
    cs.forEach((d) => { batch.update(d.ref, { status: 'payable', settledAt: FV.serverTimestamp() }); });
    commissionsFlipped = cs.size;
  }

  // b) notify the student/guardian
  const notifyId = inv.studentUserId || inv.guardianId || inv.studentId || 'student';
  batch.set(db.collection('notifications').doc(), {
    userId: notifyId,
    type: 'fee',
    title: 'Payment received',
    body: 'Your payment for ' + (inv.desc || inv.description || 'tuition') + ' was received. Thank you.',
    read: false,
    createdAt: FV.serverTimestamp(),
  });

  // c) audit (append-only)
  batch.set(db.collection('auditLogs').doc(), {
    actorUid: 'system',
    action: 'payment.settled',
    detail: 'Invoice ' + invoiceId + ' paid via ' + gateway + (gatewayTxnId ? (' (txn ' + gatewayTxnId + ')') : ''),
    createdAt: FV.serverTimestamp(),
  });

  await batch.commit();
  return { ok: true, settled: true, commissionsFlipped };
}

module.exports = { settleInvoice };
