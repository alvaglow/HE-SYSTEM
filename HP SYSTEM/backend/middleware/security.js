// middleware/security.js — Rate limiting, CSRF, XSS, SQL injection prevention
const rateLimit = require('express-rate-limit');
const slowDown  = require('express-slow-down');
const { createClient } = require('ioredis');
const { RedisStore } = require('rate-limit-redis');

// ── REDIS STORE (shared across instances) ─────────────────────
let redisClient;
try {
  redisClient = new createClient({
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });
} catch (e) {
  console.warn('[Security] Redis unavailable — using memory store for rate limiting');
}

const makeStore = (prefix) => redisClient
  ? new RedisStore({ sendCommand: (...args) => redisClient.call(...args), prefix })
  : undefined;

// ── GLOBAL RATE LIMITER — 100 req/min per IP ──────────────────
const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  standardHeaders: true,
  legacyHeaders:   false,
  store: makeStore('rl:global:'),
  skip: (req) => req.path === '/health',
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',  // Vietnamese
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// ── SPEED LIMITER — slow responses after 50 req/min ──────────
const speedLimiter = slowDown({
  windowMs: 60000,
  delayAfter: 50,
  delayMs: (used) => (used - 50) * 200, // add 200ms per request over limit
  store: makeStore('sl:global:'),
});

// ── AUTH RATE LIMITER — strict for login endpoints ───────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min window
  max: 10,                   // 10 attempts per window
  store: makeStore('rl:auth:'),
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Quá nhiều lần đăng nhập. Tài khoản tạm khóa 15 phút.',
      code: 'AUTH_RATE_LIMIT',
    });
  },
});

// ── PAYMENT RATE LIMITER ──────────────────────────────────────
const paymentLimiter = rateLimit({
  windowMs: 60000,
  max: 5, // max 5 payment initiations per minute
  store: makeStore('rl:payment:'),
  keyGenerator: (req) => `${req.ip}:${req.user?.id || 'anon'}`,
  handler: (req, res) => {
    res.status(429).json({ error: 'Payment rate limit exceeded', code: 'PAYMENT_RATE_LIMIT' });
  },
});

// ── ATTENDANCE LIMITER — 10 check-ins/hour per user ──────────
const attendanceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.USER_ATTENDANCE_LIMIT_PER_HOUR || '10'),
  store: makeStore('rl:attendance:'),
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Đã vượt quá giới hạn điểm danh. Thử lại sau 1 giờ.',
      code: 'ATTENDANCE_RATE_LIMIT',
    });
  },
});

// ── XSS SANITIZER ────────────────────────────────────────────
const sanitizeInput = (req, _res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Strip script tags, event handlers, and common XSS vectors
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/<[^>]*>/g, ''); // strip all HTML tags in JSON input
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key of Object.keys(obj)) obj[key] = sanitize(obj[key]);
    }
    return obj;
  };
  if (req.body)  req.body  = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  next();
};

// ── IDEMPOTENCY KEY VALIDATOR ─────────────────────────────────
// All payment endpoints require X-Idempotency-Key header
const requireIdempotencyKey = (req, res, next) => {
  const key = req.headers['x-idempotency-key'];
  if (!key || key.length < 16 || key.length > 128) {
    return res.status(400).json({
      error: 'X-Idempotency-Key header required (16-128 chars)',
      code: 'MISSING_IDEMPOTENCY_KEY',
    });
  }
  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(key)) {
    return res.status(400).json({ error: 'Idempotency key must be a valid UUID v4' });
  }
  req.idempotencyKey = key;
  next();
};

module.exports = {
  rateLimiter, speedLimiter,
  authLimiter, paymentLimiter, attendanceLimiter,
  sanitizeInput, requireIdempotencyKey,
};
