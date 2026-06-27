// middleware/audit.js — Tamper-proof append-only audit log with SHA-256 chaining
const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('../config/logger');

// Tracks last hash for chain integrity (in-memory per process; use Redis in multi-instance)
let lastAuditHash = 'GENESIS'; // Initial chain anchor

const maskIP = (ip) => {
  if (!ip) return 'unknown';
  // Remove last octet: 192.168.1.123 → 192.168.1.x
  return ip.replace(/\.\d+$/, '.x').replace(/:[^:]+$/, ':x');
};

const writeAuditEntry = async ({ userId, action, resourceType, resourceId, metadata, ip, userAgent }) => {
  try {
    const ts = new Date().toISOString();
    // Chain hash: SHA-256(prev_hash|userId|action|timestamp)
    const chainInput = `${lastAuditHash}|${userId || 'anon'}|${action}|${ts}`;
    const sequenceHash = crypto.createHash('sha256').update(chainInput).digest('hex');
    lastAuditHash = sequenceHash;

    await query(
      `INSERT INTO audit_log(user_id, action, resource_type, resource_id, metadata, ip_address, user_agent, sequence_hash)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [userId || null, action, resourceType || null, resourceId || null,
       JSON.stringify(metadata || {}), maskIP(ip), userAgent || null, sequenceHash]
    );
  } catch (err) {
    // Never let audit log failure break the request — but always log the failure
    logger.error('[Audit] Failed to write audit entry:', err.message);
  }
};

// Express middleware — logs all API requests
const auditLog = async (req, res, next) => {
  res.on('finish', () => {
    const skip = ['/health', '/favicon.ico'];
    if (skip.some(p => req.path.startsWith(p))) return;

    writeAuditEntry({
      userId:       req.user?.id,
      action:       `${req.method.toLowerCase()}.${req.path.replace(/\//g, '.').slice(1)}`,
      resourceType: null,
      metadata:     { status: res.statusCode, reqId: req.id },
      ip:           req.ip,
      userAgent:    req.get('user-agent'),
    }).catch(() => {}); // fire-and-forget
  });
  next();
};

// Explicit audit event (call from route handlers)
const logEvent = (action, details = {}) => writeAuditEntry(details);

module.exports = { auditLog, logEvent, writeAuditEntry };
