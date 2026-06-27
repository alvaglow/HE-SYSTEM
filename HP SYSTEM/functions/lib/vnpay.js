// lib/vnpay.js — VNPay gateway adapter (HMAC-SHA512). Signing preserved from the
// original backend service. Building the pay URL is local; no API call needed.
const crypto = require('crypto');
const moment = require('moment-timezone');

const cfg = () => ({
  TMN_CODE: process.env.VNPAY_TMN_CODE,
  HASH_SECRET: process.env.VNPAY_HASH_SECRET,
  ENDPOINT: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  RETURN_URL: process.env.VNPAY_RETURN_URL,
});

const hmac512 = (data, key) => crypto.createHmac('sha512', key).update(data).digest('hex');

const sortedQS = (params) => Object.keys(params)
  .filter((k) => params[k] !== '' && params[k] !== undefined && params[k] !== null)
  .sort()
  .map((k) => `${k}=${params[k]}`)
  .join('&');

const sign = (params, secret) => hmac512(sortedQS(params), secret);

// Verify a VNPay return/IPN signature.
const verifySignature = (params) => {
  const { HASH_SECRET } = cfg();
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = params;
  const expected = sign(rest, HASH_SECRET);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(vnp_SecureHash || ''));
  } catch (_) { return false; }
};

// Build a VNPay payment URL. txnRef encodes the invoice so the IPN can resolve it.
function createPaymentUrl({ txnRef, amountVND, orderInfo, ipAddr }) {
  const c = cfg();
  const now = moment().tz('Asia/Ho_Chi_Minh');
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: c.TMN_CODE,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: encodeURIComponent('HP System - ' + orderInfo).slice(0, 255),
    vnp_OrderType: 'edu',
    vnp_Amount: amountVND * 100, // VNPay uses the smallest unit
    vnp_ReturnUrl: c.RETURN_URL,
    vnp_IpAddr: ipAddr || '127.0.0.1',
    vnp_CreateDate: now.format('YYYYMMDDHHmmss'),
    vnp_ExpireDate: now.clone().add(15, 'minutes').format('YYYYMMDDHHmmss'),
  };
  const secureHash = sign(params, c.HASH_SECRET);
  return `${c.ENDPOINT}?${sortedQS(params)}&vnp_SecureHash=${secureHash}&vnp_SecureHashType=SHA512`;
}

module.exports = { createPaymentUrl, verifySignature, sign, sortedQS };
