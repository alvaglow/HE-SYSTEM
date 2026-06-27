// routes/webhooks.js — Raw-body webhook handlers for all payment gateways
// CRITICAL: These routes must bypass JSON body parsing (use rawBody)
const express = require('express');
const { verifyCallbackMac } = require('../services/zalopay');
const zalopay = require('../services/zalopay');
const vnpay   = require('../services/vnpay');
const momo    = require('../services/momo');
const { query } = require('../config/database');
const logger  = require('../config/logger');

const router = express.Router();

// No auth middleware on webhooks — gateway-specific signature verification instead
// No idempotency key middleware — gateways don't send one

// ── ZALOPAY CALLBACK ──────────────────────────────────────────

router.post('/zalopay', async (req, res) => {
  try {
    // Raw body is attached by server.js bodyParser.raw for /webhooks/*
    const rawBody = req.rawBody?.toString('utf8') || JSON.stringify(req.body);
    const result  = await zalopay.processCallback(rawBody, req.headers);
    // ZaloPay expects return_code 1 to stop retries
    res.json({ return_code: 1, return_message: 'OK' });
  } catch (err) {
    logger.error('[Webhook/ZaloPay] Error:', err.message);
    // Return 1 (error) to trigger ZaloPay retry
    res.status(200).json({ return_code: 0, return_message: err.message });
  }
});

// ── VNPAY IPN ─────────────────────────────────────────────────

router.get('/vnpay', async (req, res) => {
  // VNPay IPN uses GET with query params
  try {
    const result = await vnpay.verifyReturn(req.query);
    if (result.status === 'success') {
      res.json({ RspCode: '00', Message: 'Confirmed' });
    } else {
      res.json({ RspCode: '02', Message: 'Payment failed' });
    }
  } catch (err) {
    logger.error('[Webhook/VNPay] Error:', err.message);
    res.json({ RspCode: '99', Message: 'Unknown error' });
  }
});

// VNPay return URL (user redirect — not a webhook, but handled here for clarity)
router.get('/vnpay/return', async (req, res) => {
  try {
    const result = await vnpay.verifyReturn(req.query);
    const redirectBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (result.status === 'success') {
      res.redirect(`${redirectBase}/payment/success?ref=${result.txnRef}`);
    } else {
      res.redirect(`${redirectBase}/payment/failed?ref=${result.txnRef}&code=${result.responseCode}`);
    }
  } catch (err) {
    logger.error('[Webhook/VNPay/return] Error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
  }
});

// ── MOMO IPN ─────────────────────────────────────────────────

router.post('/momo', async (req, res) => {
  try {
    const body = req.body; // MoMo sends JSON
    const result = await momo.processIpn(body);
    // MoMo expects exactly: { partnerCode, requestId, orderId, resultCode: 0, message: 'Success', responseTime }
    res.json(result);
  } catch (err) {
    logger.error('[Webhook/MoMo] Error:', err.message);
    res.status(200).json({
      partnerCode: process.env.MOMO_PARTNER_CODE,
      requestId: req.body?.requestId,
      orderId:   req.body?.orderId,
      resultCode: 99,
      message: 'Error',
      responseTime: Date.now(),
    });
  }
});

// ── HEALTH CHECK FOR GATEWAYS ─────────────────────────────────

router.get('/health', (req, res) => {
  res.json({ status: 'ok', gateways: ['zalopay', 'vnpay', 'momo'], timestamp: new Date().toISOString() });
});

module.exports = router;
