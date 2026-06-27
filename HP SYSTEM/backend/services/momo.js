// services/momo.js — MoMo payment integration
// HMAC-SHA256 signed per MoMo ATM/QR specification
const crypto = require('crypto');
const axios  = require('axios');
const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../config/database');
const { logEvent } = require('../middleware/audit');
const logger = require('../config/logger');

const PARTNER_CODE = process.env.MOMO_PARTNER_CODE;
const ACCESS_KEY   = process.env.MOMO_ACCESS_KEY;
const SECRET_KEY   = process.env.MOMO_SECRET_KEY;
const ENDPOINT     = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api';
const NOTIFY_URL   = process.env.MOMO_NOTIFY_URL;
const RETURN_URL   = process.env.MOMO_RETURN_URL;

// ── HMAC-SHA256 ───────────────────────────────────────────────

const hmacSHA256 = (data, key) =>
  crypto.createHmac('sha256', key).update(data).digest('hex');

// MoMo signature format (concatenated key=value, sorted by key name in spec order):
// accessKey=...&amount=...&extraData=...&ipnUrl=...&orderId=...&orderInfo=...
// &partnerCode=...&redirectUrl=...&requestId=...&requestType=...
const buildCreateSignature = (p) => {
  const raw = `accessKey=${ACCESS_KEY}&amount=${p.amount}&extraData=${p.extraData}`
    + `&ipnUrl=${p.ipnUrl}&orderId=${p.orderId}&orderInfo=${p.orderInfo}`
    + `&partnerCode=${p.partnerCode}&redirectUrl=${p.redirectUrl}`
    + `&requestId=${p.requestId}&requestType=${p.requestType}`;
  return hmacSHA256(raw, SECRET_KEY);
};

// MoMo query signature:
// accessKey=...&orderId=...&partnerCode=...&requestId=...
const buildQuerySignature = (requestId, orderId) => {
  const raw = `accessKey=${ACCESS_KEY}&orderId=${orderId}&partnerCode=${PARTNER_CODE}&requestId=${requestId}`;
  return hmacSHA256(raw, SECRET_KEY);
};

// MoMo IPN callback verification:
// accessKey=...&amount=...&extraData=...&message=...&orderId=...&orderInfo=...
// &orderType=...&partnerCode=...&payType=...&requestId=...&responseTime=...
// &resultCode=...&transId=...
const verifyIpnSignature = (body) => {
  const raw = `accessKey=${ACCESS_KEY}&amount=${body.amount}&extraData=${body.extraData}`
    + `&message=${body.message}&orderId=${body.orderId}&orderInfo=${body.orderInfo}`
    + `&orderType=${body.orderType}&partnerCode=${body.partnerCode}&payType=${body.payType}`
    + `&requestId=${body.requestId}&responseTime=${body.responseTime}`
    + `&resultCode=${body.resultCode}&transId=${body.transId}`;
  const expected = hmacSHA256(raw, SECRET_KEY);
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(body.signature || '')
  );
};

// ── CREATE PAYMENT ────────────────────────────────────────────

const createPayment = async ({ invoiceId, userId, amountVND, description, idempotencyKey }) => {
  // Idempotency check
  const existing = await query(
    `SELECT * FROM payments WHERE idempotency_key=$1`, [idempotencyKey]
  );
  if (existing.rows[0]) {
    return { paymentId: existing.rows[0].id, existing: true };
  }

  const requestId = uuidv4();
  const orderId   = `${PARTNER_CODE}_${idempotencyKey.slice(0,8)}_${Date.now()}`;
  const orderInfo = `HP System - ${description}`;
  const extraData = Buffer.from(JSON.stringify({ invoiceId, userId })).toString('base64');

  const params = {
    partnerCode: PARTNER_CODE,
    requestType: 'payWithMethod',  // Supports QR, ATM, e-wallet
    ipnUrl:      NOTIFY_URL,
    redirectUrl: RETURN_URL,
    orderId,
    amount:      amountVND,
    orderInfo,
    requestId,
    extraData,
    lang:        'vi',
    autoCapture: true,
    orderExpireTime: 15, // minutes
  };
  params.signature = buildCreateSignature(params);

  let gatewayRes;
  try {
    const res = await axios.post(`${ENDPOINT}/create`, params, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    gatewayRes = res.data;
  } catch (err) {
    logger.error('[MoMo] API error:', err.message);
    throw Object.assign(new Error('MoMo gateway unavailable'), { status: 502 });
  }

  if (gatewayRes.resultCode !== 0) {
    throw Object.assign(
      new Error(`MoMo error ${gatewayRes.resultCode}: ${gatewayRes.message}`),
      { status: 400, momoCode: gatewayRes.resultCode }
    );
  }

  // Store payment
  const paymentRes = await withTransaction(async (client) => {
    const ins = await client.query(
      `INSERT INTO payments(idempotency_key, invoice_id, user_id, gateway, gateway_order_id,
         amount_vnd, status)
       VALUES($1,$2,$3,'momo',$4,$5,'pending') RETURNING id`,
      [idempotencyKey, invoiceId, userId, orderId, amountVND]
    );
    await client.query(
      `INSERT INTO payment_spend_history(user_id, amount_vnd) VALUES($1,$2)`,
      [userId, amountVND]
    );
    return ins.rows[0];
  });

  await logEvent('payment.momo.created', {
    userId, action: 'payment.momo.created',
    resourceType: 'payment', resourceId: paymentRes.id,
    metadata: { amountVND, orderId },
  });

  return {
    paymentId:   paymentRes.id,
    payUrl:      gatewayRes.payUrl,        // Redirect user here
    deeplink:    gatewayRes.deeplink,      // MoMo app deep link
    qrCodeUrl:   gatewayRes.qrCodeUrl,    // QR code image URL
    orderId,
    amountVND,
    expiresIn:   900,
  };
};

// ── PROCESS IPN (callback from MoMo) ─────────────────────────

const processIpn = async (body) => {
  // 1. Verify HMAC-SHA256
  if (!verifyIpnSignature(body)) {
    logger.warn('[MoMo] IPN signature FAILED for order:', body.orderId);
    throw Object.assign(new Error('Signature mismatch'), { status: 400 });
  }

  // 2. Store raw webhook
  await query(
    `INSERT INTO payment_webhooks(gateway, raw_body, hmac_valid) VALUES('momo',$1,TRUE)`,
    [JSON.stringify(body)]
  );

  // MoMo resultCode 0 = success
  const status = body.resultCode === 0 ? 'success' : 'failed';

  // 3. Update payment
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE payments SET status=$1, gateway_txn_id=$2, hmac_verified=TRUE,
         webhook_received_at=NOW(), completed_at=CASE WHEN $1='success' THEN NOW() END
       WHERE gateway_order_id=$3`,
      [status, String(body.transId), body.orderId]
    );
    if (status === 'success') {
      await client.query(
        `UPDATE invoices i SET status='paid', updated_at=NOW()
         FROM payments p WHERE p.invoice_id=i.id AND p.gateway_order_id=$1`,
        [body.orderId]
      );
    }
  });

  await logEvent('payment.momo.ipn', {
    action: 'payment.momo.ipn',
    resourceType: 'payment',
    metadata: { orderId: body.orderId, status, resultCode: body.resultCode },
  });

  // MoMo expects exactly this response on success
  return { partnerCode: PARTNER_CODE, requestId: body.requestId, orderId: body.orderId, resultCode: 0, message: 'Success', responseTime: Date.now() };
};

// ── QUERY ORDER STATUS ────────────────────────────────────────

const queryOrder = async (orderId) => {
  const requestId = uuidv4();
  const signature = buildQuerySignature(requestId, orderId);
  const res = await axios.post(`${ENDPOINT}/query`, {
    partnerCode: PARTNER_CODE, requestId, orderId, lang: 'vi', signature,
  }, { headers: { 'Content-Type': 'application/json' }, timeout: 8000 });
  return res.data;
};

module.exports = { createPayment, processIpn, queryOrder, verifyIpnSignature };
