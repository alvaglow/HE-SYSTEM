// server.js — HP System Backend
// 14-layer security stack + all routes
'use strict';
const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const hpp          = require('hpp');
const bodyParser   = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const logger       = require('./config/logger');
const { rateLimiter, speedLimiter, sanitizeInput } = require('./middleware/security');
const { auditLog } = require('./middleware/audit');
const { pool }     = require('./config/database');

const app = express();

// ── LAYER 1: Trust proxy (Nginx/load balancer) ────────────────
app.set('trust proxy', 1);

// ── LAYER 2: Request ID ───────────────────────────────────────
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// ── LAYER 3: Security headers (Helmet) ───────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'",
        'https://sandbox.zalopay.vn', 'https://openapi.zalopay.vn',
        'https://sandbox.vnpayment.vn', 'https://vnpayment.vn',
        'https://test-payment.momo.vn', 'https://payment.momo.vn',
        'https://openapi.zalo.me',
      ],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// ── LAYER 4: CORS ─────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) callback(null, true);
    else callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-Request-Id'],
}));

// ── LAYER 5: Body parsing (raw for webhooks) ──────────────────
// Webhooks need raw body for HMAC verification
app.use('/api/webhooks', bodyParser.raw({ type: '*/*', limit: '1mb' }), (req, res, next) => {
  req.rawBody = req.body;
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── LAYER 6: HTTP Parameter Pollution protection ──────────────
app.use(hpp());

// ── LAYER 7: Global rate limiting ────────────────────────────
app.use(rateLimiter);
app.use(speedLimiter);

// ── LAYER 8: Input sanitization ──────────────────────────────
app.use(sanitizeInput);

// ── LAYER 9: Audit logging ────────────────────────────────────
app.use(auditLog);

// ── LAYER 10: Request logging ─────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method, url: req.url, status: res.statusCode,
      ms: Date.now() - start, requestId: req.id,
    });
  });
  next();
});

// ── LAYER 11: Routes ──────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/payments',   require('./routes/payments'));
app.use('/api/webhooks',   require('./routes/webhooks'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/students',   require('./routes/students'));
app.use('/api/parents',    require('./routes/parents'));

// ── LAYER 12: 404 handler ─────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

// ── LAYER 13: Global error handler ───────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  // Never expose stack traces in production
  logger.error({ err: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined, requestId: req.id });
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
    requestId: req.id,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── LAYER 14: Graceful shutdown ───────────────────────────────
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => logger.info(`HP System backend listening on port ${PORT}`));

const shutdown = async (signal) => {
  logger.info(`${signal} received — graceful shutdown`);
  server.close(async () => {
    await pool.end();
    logger.info('Database pool closed');
    process.exit(0);
  });
  setTimeout(() => { logger.error('Shutdown timeout'); process.exit(1); }, 10000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app;
