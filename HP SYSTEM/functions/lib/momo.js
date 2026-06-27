// lib/momo.js — MoMo gateway adapter (HMAC-SHA256). Signing preserved from the
// original backend service; storage/settlement handled by index.js + settle.js.
const crypto = require('crypto');
const axios = require('axios');

const cfg = () => ({
  PARTNER_CODE: process.env.MOMO_PARTNER_CODE,
  ACCESS_KEY: process.env.MOMO_ACCESS_KEY,
  SECRET_KEY: process.env.MOMO_SECRET_KEY,
  ENDPOINT: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api',
  IPN_URL: process.env.MOMO_IPN_URL,
  RETURN_URL: process.env.MOMO_RETURN_URL,
});

const hmac = (data, key) => crypto.createHmac('sha256', key).update(data).digest('hex');

const buildCreateSignature = (p, ACCESS_KEY, SECRET_KEY) => {
  const raw = `accessKey=${ACCESS_KEY}&amount=${p.amount}&extraData=${p.extraData}`
    + `&ipnUrl=${p.ipnUrl}&orderId=${p.orderId}&orderInfo=${p.orderInfo}`
    + `&partnerCode=${p.partnerCode}&redirectUrl=${p.redirectUrl}`
    + `&requestId=${p.requestId}&requestType=${p.requestType}`;
  return hmac(raw, SECRET_KEY);
};

// Verify the IPN callback signature MoMo sends us.
const verifyIpnSignature = (body) => {
  const { ACCESS_KEY, SECRET_KEY } = cfg();
  const raw = `accessKey=${ACCESS_KEY}&amount=${body.amount}&extraData=${body.extraData}`
    + `&message=${body.message}&orderId=${body.orderId}&orderInfo=${body.orderInfo}`
    + `&orderType=${body.orderType}&partnerCode=${body.partnerCode}&payType=${body.payType}`
    + `&requestId=${body.requestId}&responseTime=${body.responseTime}`
    + `&resultCode=${body.resultCode}&transId=${body.transId}`;
  const expected = hmac(raw, SECRET_KEY);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(body.signature || ''));
  } catch (_) { return false; }
};

// Create a MoMo order; returns { payUrl, deeplink, qrCodeUrl, orderId }.
async function createPayment({ orderId, amountVND, orderInfo, invoiceId, userId }) {
  const c = cfg();
  const requestId = orderId;
  const extraData = Buffer.from(JSON.stringify({ invoiceId, userId })).toString('base64');
  const params = {
    partnerCode: c.PARTNER_CODE,
    requestType: 'payWithMethod',
    ipnUrl: c.IPN_URL,
    redirectUrl: c.RETURN_URL,
    orderId,
    amount: amountVND,
    orderInfo,
    requestId,
    extraData,
    lang: 'vi',
    autoCapture: true,
    orderExpireTime: 15,
  };
  params.signature = buildCreateSignature(params, c.ACCESS_KEY, c.SECRET_KEY);

  const res = await axios.post(`${c.ENDPOINT}/create`, params, {
    headers: { 'Content-Type': 'application/json' }, timeout: 10000,
  });
  if (res.data.resultCode !== 0) {
    throw new Error(`MoMo ${res.data.resultCode}: ${res.data.message}`);
  }
  return {
    payUrl: res.data.payUrl, deeplink: res.data.deeplink,
    qrCodeUrl: res.data.qrCodeUrl, orderId,
  };
}

// Decode { invoiceId, userId } from the IPN extraData.
const parseExtra = (extraData) => {
  try { return JSON.parse(Buffer.from(extraData || '', 'base64').toString('utf8')); }
  catch (_) { return {}; }
};

// Body MoMo expects back on the IPN.
const ackBody = (body) => ({
  partnerCode: cfg().PARTNER_CODE, requestId: body.requestId, orderId: body.orderId,
  resultCode: 0, message: 'Success', responseTime: Date.now(),
});

module.exports = { createPayment, verifyIpnSignature, parseExtra, ackBody };
