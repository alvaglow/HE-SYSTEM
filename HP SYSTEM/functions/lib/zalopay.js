// lib/zalopay.js — ZaloPay gateway adapter (HMAC-SHA256, KEY1 for requests,
// KEY2 for callbacks). Signing preserved from the original backend service.
const crypto = require('crypto');
const axios = require('axios');
const qs = require('qs');

const cfg = () => ({
  APP_ID: process.env.ZALOPAY_APP_ID,
  KEY1: process.env.ZALOPAY_KEY1,
  KEY2: process.env.ZALOPAY_KEY2,
  ENDPOINT: process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2',
  CALLBACK_URL: process.env.ZALOPAY_CALLBACK_URL,
});

const hmac = (data, key) => crypto.createHmac('sha256', key).update(data).digest('hex');

const buildCreateMac = (p, KEY1) => hmac(
  [p.app_id, p.app_trans_id, p.app_user, p.amount, p.app_time, p.embed_data, p.item].join('|'),
  KEY1
);

// Verify the ZaloPay callback MAC (signed with KEY2 over the raw data string).
const verifyCallbackMac = (dataStr, receivedMac) => {
  const { KEY2 } = cfg();
  const expected = hmac(dataStr, KEY2);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(receivedMac || '', 'hex'));
  } catch (_) { return false; }
};

// Create a ZaloPay order; returns { orderUrl, zpTransToken, appTransId }.
async function createOrder({ appTransId, appUser, amountVND, description, invoiceId }) {
  const c = cfg();
  const appTime = Date.now();
  const embedData = JSON.stringify({ redirecturl: c.CALLBACK_URL, invoiceId });
  const item = JSON.stringify([{ itemid: invoiceId, itemname: description, itemprice: amountVND, itemquantity: 1 }]);
  const params = {
    app_id: parseInt(c.APP_ID, 10),
    app_trans_id: appTransId,
    app_user: appUser,
    app_time: appTime,
    expire_duration_seconds: 900,
    amount: amountVND,
    item,
    embed_data: embedData,
    description: 'HP System - ' + description,
    callback_url: c.CALLBACK_URL,
    bank_code: '',
  };
  params.mac = buildCreateMac(params, c.KEY1);

  const res = await axios.post(`${c.ENDPOINT}/create`, qs.stringify(params), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000,
  });
  if (res.data.return_code !== 1) {
    throw new Error('ZaloPay: ' + res.data.return_message);
  }
  return { orderUrl: res.data.order_url, zpTransToken: res.data.zp_trans_token, appTransId };
}

module.exports = { createOrder, verifyCallbackMac, hmac };
