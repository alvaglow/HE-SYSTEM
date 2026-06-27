// middleware/auth.js — JWT RS256 + device binding + session management
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');
const { query, withTransaction } = require('../config/database');
const logger  = require('../config/logger');

// ── RSA KEYS ──────────────────────────────────────────────────
const PRIVATE_KEY = fs.readFileSync(path.resolve(process.env.JWT_PRIVATE_KEY_PATH));
const PUBLIC_KEY  = fs.readFileSync(path.resolve(process.env.JWT_PUBLIC_KEY_PATH));

const SESSION_TIMEOUT = {
  parent:  parseInt(process.env.SESSION_TIMEOUT_PARENT_MS  || '900000'),   // 15 min
  student: parseInt(process.env.SESSION_TIMEOUT_STUDENT_MS || '14400000'), // 4 hr
  teacher: 28800000, admin: 28800000, management: 28800000, partner: 28800000,
};

// ── TOKEN GENERATION ─────────────────────────────────────────

const signAccessToken = (payload) => jwt.sign(
  { ...payload, iat: Math.floor(Date.now() / 1000) },
  PRIVATE_KEY,
  { algorithm: 'RS256', expiresIn: process.env.JWT_ACCESS_EXPIRY || '5m',
    issuer: process.env.JWT_ISSUER }
);

const signRefreshToken = () => crypto.randomBytes(48).toString('base64url');

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// ── ISSUE FULL TOKEN PAIR ─────────────────────────────────────

const issueTokens = async (user, deviceId) => {
  const refreshToken = signRefreshToken();
  const tokenHash    = hashToken(refreshToken);
  const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await withTransaction(async (client) => {
    // Revoke old tokens for this device (rotation)
    await client.query(
      `UPDATE refresh_tokens SET revoked=TRUE, revoked_reason='rotation'
       WHERE user_id=$1 AND device_id=$2 AND revoked=FALSE`,
      [user.id, deviceId]
    );
    // Store new refresh token
    await client.query(
      `INSERT INTO refresh_tokens(user_id, token_hash, device_id, expires_at)
       VALUES($1,$2,$3,$4)`,
      [user.id, tokenHash, deviceId, expiresAt]
    );
    // Update device last_seen
    await client.query(
      `UPDATE user_devices SET last_seen=NOW() WHERE user_id=$1 AND device_id=$2`,
      [user.id, deviceId]
    );
  });

  const accessToken = signAccessToken({
    sub:      user.id,
    role:     user.role,
    deviceId,
    jti:      crypto.randomUUID(), // unique per token (replay protection)
  });

  return { accessToken, refreshToken };
};

// ── DEVICE VALIDATION ─────────────────────────────────────────

const validateDevice = async (userId, deviceId, role) => {
  const res = await query(
    `SELECT * FROM user_devices WHERE user_id=$1 AND device_id=$2`,
    [userId, deviceId]
  );
  const device = res.rows[0];

  if (!device) {
    // New device — check limit
    const maxDevices = role === 'parent' ?
      parseInt(process.env.MAX_DEVICES_PARENT || '2') :
      parseInt(process.env.MAX_DEVICES_STUDENT || '1');

    const countRes = await query(
      `SELECT COUNT(*) FROM user_devices WHERE user_id=$1 AND approved=TRUE`,
      [userId]
    );
    const count = parseInt(countRes.rows[0].count);
    if (count >= maxDevices) {
      throw Object.assign(new Error(`Maximum ${maxDevices} device(s) allowed`), { status: 403 });
    }
    // Register new device with 24-hr cooldown
    const cooldownUntil = new Date(
      Date.now() + parseInt(process.env.DEVICE_COOLDOWN_HOURS || '24') * 3600000
    );
    await query(
      `INSERT INTO user_devices(user_id, device_id, device_name, platform, cooldown_until, approved)
       VALUES($1,$2,'New Device','unknown',$3,FALSE)`,
      [userId, deviceId, cooldownUntil]
    );
    throw Object.assign(
      new Error('New device pending approval. Check your email within 24 hours.'),
      { status: 403, code: 'DEVICE_PENDING' }
    );
  }

  if (!device.approved) {
    if (device.cooldown_until && new Date() < new Date(device.cooldown_until)) {
      throw Object.assign(
        new Error('Device not yet approved. Check your email for approval link.'),
        { status: 403, code: 'DEVICE_COOLDOWN' }
      );
    }
  }
  return device;
};

// ── AUTHENTICATE MIDDLEWARE ────────────────────────────────────

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }
    const token = authHeader.slice(7);

    let payload;
    try {
      payload = jwt.verify(token, PUBLIC_KEY, {
        algorithms: ['RS256'],
        issuer: process.env.JWT_ISSUER,
      });
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Session timeout check by role
    const issuedAt   = payload.iat * 1000;
    const timeout    = SESSION_TIMEOUT[payload.role] || 3600000;
    if (Date.now() - issuedAt > timeout) {
      return res.status(401).json({ error: 'Session expired', code: 'SESSION_TIMEOUT' });
    }

    // Fetch user from DB to get latest status
    const userRes = await query(
      `SELECT id, role, status FROM users WHERE id=$1`,
      [payload.sub]
    );
    const user = userRes.rows[0];
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Account inactive or not found' });
    }

    req.user     = { id: user.id, role: user.role };
    req.deviceId = payload.deviceId;
    next();
  } catch (err) {
    next(err);
  }
};

// ── ROLE GUARD ────────────────────────────────────────────────

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// ── REFRESH TOKEN HANDLER ─────────────────────────────────────

const rotateRefreshToken = async (oldRefreshToken, deviceId) => {
  const tokenHash = hashToken(oldRefreshToken);

  return await withTransaction(async (client) => {
    const res = await client.query(
      `SELECT * FROM refresh_tokens WHERE token_hash=$1 AND revoked=FALSE`,
      [tokenHash]
    );
    const stored = res.rows[0];

    if (!stored) {
      // REUSE DETECTION — revoke ALL tokens for this user (breach response)
      const hashRes = await client.query(
        `SELECT user_id FROM refresh_tokens WHERE token_hash=$1`, [tokenHash]
      );
      if (hashRes.rows[0]) {
        await client.query(
          `UPDATE refresh_tokens SET revoked=TRUE, revoked_reason='reuse_detected'
           WHERE user_id=$1`, [hashRes.rows[0].user_id]
        );
        logger.warn(`SECURITY: Refresh token reuse detected for user ${hashRes.rows[0].user_id}`);
      }
      throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    }

    if (new Date() > new Date(stored.expires_at)) {
      throw Object.assign(new Error('Refresh token expired'), { status: 401 });
    }

    // Mark old as used
    await client.query(
      `UPDATE refresh_tokens SET used_at=NOW(), revoked=TRUE, revoked_reason='rotation'
       WHERE id=$1`, [stored.id]
    );

    // Issue new tokens
    const userRes = await client.query(
      `SELECT id, role FROM users WHERE id=$1 AND status='active'`, [stored.user_id]
    );
    if (!userRes.rows[0]) throw Object.assign(new Error('User not found'), { status: 401 });

    return issueTokens(userRes.rows[0], stored.device_id);
  });
};

module.exports = {
  signAccessToken, issueTokens, rotateRefreshToken,
  authenticate, requireRole, validateDevice, hashToken,
};
