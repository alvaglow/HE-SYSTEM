// services/zalopay.js — ZaloPay payment integration
// HMAC-SHA256 signed, idempotency-safe, anomaly-detected
const crypto = require('crypto');
const axios  = require('axios');
const qs     = require('qs');
const { query, withTransaction } = require('../config/database');
const { logEvent } = require('../middleware/audit');
const logger = require('../config/logger');

const APP_ID   = process.env.ZALOPAY_APP_ID;
const KEY1     = process.env.ZALOPAY_KEY1;  // HMAC key for requests
const KEY2     = process.env.ZALOPAY_KEY2;  // HMAC key for callbacks
const ENDPOINT = process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2';

// ── HMAC-SHA256 SIGNATURE ─────────────────────────────────────
// CRITICAL: All ZaloPay requests and callbacks must be HMAC verified

const hmacSHA256 = (data, key) =>
  crypto.createHmac('sha256', key).update(data).digest('hex');

// ZaloPay create order signature format:
// app_id|app_trans_id|app_user|amount|app_time|embed_data|item
const buildCreateOrderMac = (params) => {
  const data = [
    params.app_id,
    params.app_trans_id,
    params.app_user,
    params.amount,
    params.app_time,
    params.embed_data,
    params.item,
  ].join('|');
  return hmacSHA256(data, KEY1);
};

// ZaloPay query order signature:
// app_id|app_trans_id|key1
const buildQueryMac = (appTransId) => {
  const data = `${APP_ID}|${appTransId}|${KEY1}`;
  return hmacSHA256(data, KEY1);
};

// ZaloPay callback verification signature:
// data (raw JSON string)
const verifyCallbackMac = (data, receivedMac) => {
  const expectedMac = hmacSHA256(data, KEY2);
  // Constant-time comparison prevents timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expectedMac, 'hex'),
    Buffer.from(receivedMac, 'hex')
  );
};

// ── ANOMALY DETECTION (2 standard deviations rule) ───────────

const checkAnomaly = async (userId, amountVND) => {
  // Get last 90 days of payments for this user
  const res = await query(
    `SELECT amount_vnd FROM payment_spend_history
     WHERE user_id=$1 AND created_at > NOW() - INTERVAL '90 days'
     ORDER BY created_at DESC LIMIT 100`,
    [userId]
  );
  const history = res.rows.map(r => parseInt(r.amount_vnd));

  if (history.length < 3) return { flagged: false }; // insufficient data

  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const variance = history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / history.length;
  const stdDev = Math.sqrt(variance);
  const threshold = mean + 2 * stdDev;

  if (amountVND > threshold) {
    logger.warn(`[ZaloPay] Anomaly detected: user=${userId} amount=${amountVND} threshold=${threshold}`);
    return {
      flagged: true,
      reason: `Amount ${amountVND} VND exceeds 2σ threshold (${Math.round(threshold)} VND)`,
    };
  }
  return { flagged: false };
};

// ── CREATE PAYMENT ORDER ──────────────────────────────────────

const createOrder = async ({ invoiceId, userId, amountVND, description, idempotencyKey }) => {
  // 1. Idempotency check — return existing if already created
  const existing = await query(
    `SELECT * FROM payments WHERE idempotency_key=$1`, [idempotencyKey]
  );
  if (existing.rows[0]) {
    logger.info(`[ZaloPay] Idempotency hit for key ${idempotencyKey}`);
    return { paymentId: existing.rows[0].id, existing: true, status: existing.rows[0].status };
  }

  // 2. Anomaly detection
  const anomaly = await checkAnomaly(userId, amountVND);

  // 3. Lock amount for this checkout session (no floating rate during session)
  const lockedAmount = amountVND; // VND has no decimals — lock immediately

  // 4. Build ZaloPay order
  const appTime     = Date.now();
  const appTransId  = `${new Date().toISOString().slice(0,10).replace(/-/g,'')}_${idempotencyKey.slice(0,8)}`;
  const embedData   = JSON.stringify({ redirecturl: process.env.ZALOPAY_CALLBACK_URL });
  const items       = JSON.stringify([{ itemid: invoiceId, itemname: description, itemprice: lockedAmount, itemquantity: 1 }]);

  const orderParams = {
    app_id:       parseInt(APP_ID),
    app_trans_id: appTransId,
    app_user:     userId,
    app_time:     appTime,
    expire_duration_seconds: 900, // 15 min checkout session
    amount:       lockedAmount,
    item:         items,
    embed_data:   embedData,
    description:  `HP System - ${description}`,
    callback_url: process.env.ZALOPAY_CALLBACK_URL,
    bank_code:    '',
  };
  orderParams.mac = buildCreateOrderMac(orderParams);

  // 5. Call ZaloPay API
  let gatewayResponse;
  try {
    const response = await axios.post(`${ENDPOINT}/create`, qs.stringify(orderParams), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });
    gatewayResponse = response.data;
  } catch (err) {
    logger.error('[ZaloPay] API call failed:', err.message);
    throw Object.assign(new Error('Payment gateway unavailable'), { status: 502 });
  }

  if (gatewayResponse.return_code !== 1) {
    throw Object.assign(
      new Error(`ZaloPay error: ${gatewayResponse.return_message}`),
      { status: 400, gatewayCode: gatewayResponse.return_code }
    );
  }

  // 6. Store payment record
  const paymentRes = await withTransaction(async (client) => {
    const ins = await client.query(
      `INSERT INTO payments(idempotency_key, invoice_id, user_id, gateway, gateway_order_id,
         amount_vnd, status, anomaly_flag, anomaly_reason)
       VALUES($1,$2,$3,'zalopay',$4,$5,'pending',$6,$7)
       RETURNING id`,
      [idempotencyKey, invoiceId, userId, appTransId, lockedAmount,
       anomaly.flagged, anomaly.reason || null]
    );
    // Record spend for future anomaly detection (only after successful order creation)
    await client.query(
      `INSERT INTO payment_spend_history(user_id, amount_vnd) VALUES($1,$2)`,
      [userId, lockedAmount]
    );
    return ins.rows[0];
  });

  await logEvent('payment.zalopay.created', {
    userId, action: 'payment.zalopay.created',
    resourceType: 'payment', resourceId: paymentRes.id,
    metadata: { amountVND: lockedAmount, appTransId, anomalyFlag: anomaly.flagged },
  });

  return {
    paymentId:   paymentRes.id,
    orderUrl:    gatewayResponse.order_url,   // Deep link for ZaloPay app
    qrCode:      gatewayResponse.zp_trans_token,
    appTransId,
    amountVND:   lockedAmount,
    expiresAt:   new Date(appTime + 900000).toISOString(),
  };
};

// ── QUERY ORDER STATUS ────────────────────────────────────────

const queryOrder = async (appTransId) => {
  const mac  = buildQueryMac(appTransId);
  const body = qs.stringify({ app_id: parseInt(APP_ID), app_trans_id: appTransId, mac });
  const res  = await axios.post(`${ENDPOINT}/query`, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 8000,
  });
  return res.data;
};

// ── PROCESS CALLBACK (webhook) ────────────────────────────────

const processCallback = async (rawBody, headers) => {
  // 1. Parse and verify HMAC immediately
  let parsed;
  try { parsed = JSON.parse(rawBody); } catch {
    throw Object.assign(new Error('Invalid callback JSON'), { status: 400 });
  }

  const dataStr = parsed.data;  // JSON string of transaction data
  const mac     = parsed.mac;   // HMAC-SHA256(data, KEY2)

  if (!verifyCallbackMac(dataStr, mac)) {
    logger.warn('[ZaloPay] Callback HMAC verification FAILED');
    throw Object.assign(new Error('HMAC verification failed'), { status: 400, code: 'HMAC_INVALID' });
  }

  // 2. Parse transaction data
  const txData = JSON.parse(dataStr);

  // 3. Store raw webhook (immutable)
  await query(
    `INSERT INTO payment_webhooks(gateway, raw_body, headers, hmac_valid)
     VALUES('zalopay',$1,$2,TRUE)`,
    [rawBody, JSON.stringify(headers)]
  );

  // 4. Update payment status
  const status = txData.return_code === 1 ? 'success' : 'failed';
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE payments
       SET status=$1, gateway_txn_id=$2, hmac_verified=TRUE,
           webhook_received_at=NOW(), completed_at=CASE WHEN $1='success' THEN NOW() END
       WHERE gateway_order_id=$3`,
      [status, String(txData.zp_trans_id), txData.app_trans_id]
    );
    if (status === 'success') {
      // Mark invoice as paid
      await client.query(
        `UPDATE invoices i SET status='paid', updated_at=NOW()
         FROM payments p WHERE p.invoice_id=i.id AND p.gateway_order_id=$1`,
        [txData.app_trans_id]
      );
    }
  });

  await logEvent('payment.zalopay.callback', {
    action: 'payment.zalopay.callback',
    resourceType: 'payment',
    metadata: { appTransId: txData.app_trans_id, status, zpTransId: txData.zp_trans_id },
  });

  return { status, zpTransId: txData.zp_trans_id };
};

// ── EXPONENTIAL BACKOFF RETRY (7-day window) ─────────────────
// Cron calls this every N minutes for failed payments

const retryFailed = async () => {
  const res = await query(
    `SELECT p.*, i.student_id FROM payments p
     JOIN invoices i ON p.invoice_id = i.id
     WHERE p.status='failed' AND p.retry_count < 21
       AND (p.next_retry_at IS NULL OR p.next_retry_at <= NOW())
       AND p.created_at > NOW() - INTERVAL '7 days'
     LIMIT 50`
  );

  for (const payment of res.rows) {
    try {
      const result = await queryOrder(payment.gateway_order_id);
      if (result.return_code === 1) {
        await query(
          `UPDATE payments SET status='success', completed_at=NOW() WHERE id=$1`,
          [payment.id]
        );
        logger.info(`[ZaloPay] Retry success for payment ${payment.id}`);
      } else {
        // Exponential backoff: 1m, 2m, 4m, 8m ... up to 24h
        const delayMs = Math.min(60000 * Math.pow(2, payment.retry_count), 86400000);
        await query(
          `UPDATE payments SET retry_count=retry_count+1, last_retry_at=NOW(),
             next_retry_at=NOW()+$1::interval
           WHERE id=$2`,
          [`${Math.round(delayMs / 60000)} minutes`, payment.id]
        );
      }
    } catch (err) {
      logger.error(`[ZaloPay] Retry error for ${payment.id}:`, err.message);
    }
  }
};

module.exports = { createOrder, queryOrder, processCallback, retryFailed, verifyCallbackMac, hmacSHA256 };
