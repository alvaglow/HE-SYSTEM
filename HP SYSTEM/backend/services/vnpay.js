// services/vnpay.js — VNPay payment integration
// HMAC-SHA512 signed per VNPay specification
const crypto = require('crypto');
const axios  = require('axios');
const moment = require('moment-timezone');
const { query, withTransaction } = require('../config/database');
const { logEvent } = require('../middleware/audit');
const logger = require('../config/logger');

const TMN_CODE  = process.env.VNPAY_TMN_CODE;
const HASH_SECRET = process.env.VNPAY_HASH_SECRET;
const ENDPOINT  = process.env.VNPAY_ENDPOINT || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const QUERY_URL = process.env.VNPAY_QUERY_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';
const RETURN_URL = process.env.VNPAY_RETURN_URL;

// ── HMAC-SHA512 (VNPay requires SHA512, NOT SHA256) ───────────

const hmacSHA512 = (data, key) =>
  crypto.createHmac('sha512', key).update(data).digest('hex');

// Build sorted query string for HMAC (VNPay specification)
const buildSortedQueryString = (params) => {
  const sorted = Object.keys(params)
    .filter(k => params[k] !== '' && params[k] !== undefined && params[k] !== null)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return sorted;
};

const buildSignature = (params) => {
  const queryStr = buildSortedQueryString(params);
  return hmacSHA512(queryStr, HASH_SECRET);
};

const verifySignature = (params, receivedHash) => {
  // Remove vnp_SecureHash before verifying
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = params;
  const expected = buildSignature(rest);
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(receivedHash)
  );
};

// ── CREATE PAYMENT URL ────────────────────────────────────────

const createPaymentUrl = async ({ invoiceId, userId, amountVND, description, idempotencyKey, ipAddr }) => {
  // Idempotency check
  const existing = await query(
    `SELECT * FROM payments WHERE idempotency_key=$1`, [idempotencyKey]
  );
  if (existing.rows[0]) {
    return { paymentId: existing.rows[0].id, existing: true };
  }

  // VNPay expects amount * 100 (no decimals)
  const vnpAmount = amountVND * 100;
  const createDate = moment().tz('Asia/Ho_Chi_Minh').format('YYYYMMDDHHmmss');
  const txnRef    = `${moment().tz('Asia/Ho_Chi_Minh').format('YYYYMMDD')}_${idempotencyKey.slice(0,8)}`;
  const expireDate = moment().tz('Asia/Ho_Chi_Minh').add(15, 'minutes').format('YYYYMMDDHHmmss');

  const vnpParams = {
    vnp_Version:     '2.1.0',
    vnp_Command:     'pay',
    vnp_TmnCode:     TMN_CODE,
    vnp_Locale:      'vn',
    vnp_CurrCode:    'VND',
    vnp_TxnRef:      txnRef,
    vnp_OrderInfo:   encodeURIComponent(`HP System - ${description}`).slice(0, 255),
    vnp_OrderType:   'edu',
    vnp_Amount:      vnpAmount,
    vnp_ReturnUrl:   RETURN_URL,
    vnp_IpAddr:      ipAddr || '127.0.0.1',
    vnp_CreateDate:  createDate,
    vnp_ExpireDate:  expireDate,
    vnp_BankCode:    '',  // Let user choose
  };

  const secureHash = buildSignature(vnpParams);
  vnpParams.vnp_SecureHash = secureHash;
  vnpParams.vnp_SecureHashType = 'SHA512';

  // Build payment URL
  const paymentUrl = `${ENDPOINT}?${buildSortedQueryString(vnpParams)}&vnp_SecureHash=${secureHash}&vnp_SecureHashType=SHA512`;

  // Store payment record
  const paymentRes = await withTransaction(async (client) => {
    const ins = await client.query(
      `INSERT INTO payments(idempotency_key, invoice_id, user_id, gateway, gateway_order_id,
         amount_vnd, status)
       VALUES($1,$2,$3,'vnpay',$4,$5,'pending') RETURNING id`,
      [idempotencyKey, invoiceId, userId, txnRef, amountVND]
    );
    await client.query(
      `INSERT INTO payment_spend_history(user_id, amount_vnd) VALUES($1,$2)`,
      [userId, amountVND]
    );
    return ins.rows[0];
  });

  await logEvent('payment.vnpay.created', {
    userId, action: 'payment.vnpay.created',
    resourceType: 'payment', resourceId: paymentRes.id,
    metadata: { amountVND, txnRef },
  });

  return { paymentId: paymentRes.id, paymentUrl, txnRef, amountVND, expiresIn: 900 };
};

// ── VERIFY RETURN URL (user redirect back) ────────────────────

const verifyReturn = async (queryParams) => {
  const { vnp_SecureHash, ...rest } = queryParams;
  if (!verifySignature(rest, vnp_SecureHash)) {
    throw Object.assign(new Error('VNPay signature invalid'), { status: 400 });
  }

  const status    = queryParams.vnp_ResponseCode === '00' ? 'success' : 'failed';
  const txnRef    = queryParams.vnp_TxnRef;
  const gatewayId = queryParams.vnp_TransactionNo;

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE payments SET status=$1, gateway_txn_id=$2, hmac_verified=TRUE, completed_at=CASE WHEN $1='success' THEN NOW() END
       WHERE gateway_order_id=$3`,
      [status, gatewayId, txnRef]
    );
    if (status === 'success') {
      await client.query(
        `UPDATE invoices i SET status='paid', updated_at=NOW()
         FROM payments p WHERE p.invoice_id=i.id AND p.gateway_order_id=$1`,
        [txnRef]
      );
    }
  });

  return { status, txnRef, responseCode: queryParams.vnp_ResponseCode };
};

// ── QUERY TRANSACTION STATUS (3 retries, exponential backoff) ─

const queryTransaction = async (txnRef, transDate, retryCount = 0) => {
  const createDate = moment().tz('Asia/Ho_Chi_Minh').format('YYYYMMDDHHmmss');
  const params = {
    vnp_RequestId:   `${Date.now()}`,
    vnp_Version:     '2.1.0',
    vnp_Command:     'querydr',
    vnp_TmnCode:     TMN_CODE,
    vnp_TxnRef:      txnRef,
    vnp_OrderInfo:   `Query ${txnRef}`,
    vnp_TransDate:   transDate,
    vnp_CreateDate:  createDate,
    vnp_IpAddr:      '127.0.0.1',
  };
  params.vnp_SecureHash = buildSignature(params);

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const res = await axios.post(QUERY_URL, params, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000,
      });
      return res.data;
    } catch (err) {
      if (attempt === retryCount) throw err;
      const delay = 1000 * Math.pow(2, attempt);
      logger.warn(`[VNPay] Query retry ${attempt+1}/${retryCount} after ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
};

module.exports = { createPaymentUrl, verifyReturn, queryTransaction, verifySignature, hmacSHA512 };
