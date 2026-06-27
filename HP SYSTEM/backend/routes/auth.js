// routes/auth.js — Register, login, TOTP setup, biometric enrollment, refresh
const express = require('express');
const bcrypt  = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode  = require('qrcode');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../config/database');
const { signAccessToken, issueTokens, rotateRefreshToken, validateDevice } = require('../middleware/auth');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const { savePII, maskPhone, maskEmail } = require('../middleware/encryption');
const { logEvent } = require('../middleware/audit');
const logger = require('../config/logger');

const router = express.Router();
router.use(authLimiter); // 10 attempts per 15 min

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// ── REGISTER ──────────────────────────────────────────────────

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 12 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/),
  body('role').isIn(['student', 'teacher', 'admin', 'management', 'partner', 'parent']),
  body('fullName').trim().isLength({ min: 2, max: 100 }),
  body('phone').optional().matches(/^\+84[0-9]{9}$/), // Vietnamese phone
], validate, async (req, res, next) => {
  try {
    const { email, password, role, fullName, phone, dateOfBirth } = req.body;

    // Check duplicate
    const dup = await query('SELECT id FROM users WHERE email=$1', [maskEmail(email)]);
    if (dup.rows[0]) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO users(id, email, password_hash, role, full_name, created_at)
         VALUES($1,$2,$3,$4,$5,NOW())`,
        [userId, maskEmail(email), passwordHash, role, fullName]
      );
      // Store PII encrypted (Decree 13 compliance)
      await savePII(userId, {
        fullName,
        email,
        phone: phone || null,
        dateOfBirth: dateOfBirth || null,
      });
    });

    await logEvent('auth.register', {
      userId, action: 'auth.register',
      metadata: { role, email: maskEmail(email) },
    });

    res.status(201).json({ success: true, message: 'Account created. Please login.' });
  } catch (err) { next(err); }
});

// ── LOGIN ─────────────────────────────────────────────────────

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1, max: 200 }),
  body('deviceId').isUUID(),
  body('totpCode').optional().isLength({ min: 6, max: 6 }).isNumeric(),
], validate, async (req, res, next) => {
  try {
    const { email, password, deviceId, totpCode } = req.body;

    // Fetch user
    const userRes = await query(
      `SELECT id, password_hash, role, full_name, totp_enabled, totp_secret, is_active, failed_login_attempts, locked_until
       FROM users WHERE email=$1`,
      [maskEmail(email)]
    );
    const user = userRes.rows[0];

    // Timing-safe "not found" (prevent enumeration)
    if (!user) {
      await bcrypt.compare(password, '$2b$12$invalidhashinvalidhashinvalidha');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Account lockout check
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Account temporarily locked', lockedUntil: user.locked_until });
    }
    if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });

    // Password check
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await query(
        `UPDATE users SET failed_login_attempts=$1, locked_until=$2 WHERE id=$3`,
        [attempts, lockUntil, user.id]
      );
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // TOTP check (if enabled — NO SMS OTP by spec)
    if (user.totp_enabled) {
      if (!totpCode) return res.status(200).json({ requiresTotp: true, message: 'Enter TOTP code' });
      const totpValid = speakeasy.totp.verify({
        secret: user.totp_secret,
        encoding: 'base32',
        token: totpCode,
        window: 1, // Allow 30s clock skew
      });
      if (!totpValid) return res.status(401).json({ error: 'Invalid TOTP code' });
    }

    // Device binding
    await validateDevice(user.id, deviceId, user.role);

    // Reset failed attempts on success
    await query(
      `UPDATE users SET failed_login_attempts=0, locked_until=NULL, last_login=NOW() WHERE id=$1`,
      [user.id]
    );

    // Issue tokens
    const { accessToken, refreshToken } = await issueTokens(user, deviceId);

    await logEvent('auth.login', {
      userId: user.id, action: 'auth.login',
      metadata: { role: user.role, deviceId },
    });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: { id: user.id, role: user.role, fullName: user.full_name },
      sessionTimeout: user.role === 'parent' ? 900 : 14400, // seconds
    });
  } catch (err) { next(err); }
});

// ── REFRESH TOKEN ─────────────────────────────────────────────

router.post('/refresh', [
  body('refreshToken').isString().isLength({ min: 10 }),
  body('deviceId').isUUID(),
], validate, async (req, res, next) => {
  try {
    const { refreshToken, deviceId } = req.body;
    const tokens = await rotateRefreshToken(refreshToken, deviceId);
    res.json({ success: true, ...tokens });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ── LOGOUT ────────────────────────────────────────────────────

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { deviceId } = req.body;
    await query(
      `UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND device_id=$2`,
      [req.user.userId, deviceId]
    );
    await logEvent('auth.logout', { userId: req.user.userId, action: 'auth.logout' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── SETUP TOTP (Google Authenticator) ────────────────────────

router.post('/totp/setup', authenticate, async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `HP System (${req.user.email})`,
      issuer: 'HP System',
      length: 32,
    });
    // Store secret TEMPORARILY (not enabled yet)
    await query(
      `UPDATE users SET totp_secret_pending=$1 WHERE id=$2`,
      [secret.base32, req.user.userId]
    );
    const qrUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qrCode: qrUrl, otpauthUrl: secret.otpauth_url });
  } catch (err) { next(err); }
});

// ── VERIFY AND ENABLE TOTP ────────────────────────────────────

router.post('/totp/enable', authenticate, [
  body('code').isLength({ min: 6, max: 6 }).isNumeric(),
], validate, async (req, res, next) => {
  try {
    const userRes = await query(
      `SELECT totp_secret_pending FROM users WHERE id=$1`, [req.user.userId]
    );
    const { totp_secret_pending } = userRes.rows[0];
    if (!totp_secret_pending) return res.status(400).json({ error: 'No pending TOTP setup' });

    const valid = speakeasy.totp.verify({
      secret: totp_secret_pending,
      encoding: 'base32',
      token: req.body.code,
      window: 1,
    });
    if (!valid) return res.status(400).json({ error: 'Invalid code' });

    await query(
      `UPDATE users SET totp_enabled=TRUE, totp_secret=totp_secret_pending, totp_secret_pending=NULL WHERE id=$1`,
      [req.user.userId]
    );
    await logEvent('auth.totp.enabled', { userId: req.user.userId, action: 'auth.totp.enabled' });
    res.json({ success: true, message: 'TOTP enabled. Use Google Authenticator for future logins.' });
  } catch (err) { next(err); }
});

// ── BIOMETRIC ENROLLMENT (mobile only) ───────────────────────

router.post('/biometric/enroll', authenticate, [
  body('deviceId').isUUID(),
  body('publicKey').isString().isLength({ min: 100 }), // Base64 public key from device
  body('biometricType').isIn(['face', 'fingerprint']),
], validate, async (req, res, next) => {
  try {
    const { deviceId, publicKey, biometricType } = req.body;
    // Store device's biometric public key (used to verify future biometric assertions)
    await query(
      `UPDATE user_devices SET biometric_public_key=$1, biometric_type=$2
       WHERE user_id=$3 AND device_id=$4`,
      [publicKey, biometricType, req.user.userId, deviceId]
    );
    await logEvent('auth.biometric.enrolled', {
      userId: req.user.userId, action: 'auth.biometric.enrolled',
      metadata: { biometricType, deviceId },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── BIOMETRIC LOGIN (mobile — verifies signature, issues tokens) ──

router.post('/biometric/login', [
  body('userId').isUUID(),
  body('deviceId').isUUID(),
  body('signature').isString(), // Signature of challenge using device biometric key
  body('challenge').isString(),
], validate, async (req, res, next) => {
  try {
    const { userId, deviceId, signature, challenge } = req.body;
    const deviceRes = await query(
      `SELECT biometric_public_key FROM user_devices WHERE user_id=$1 AND device_id=$2 AND is_active=TRUE`,
      [userId, deviceId]
    );
    if (!deviceRes.rows[0]?.biometric_public_key) {
      return res.status(401).json({ error: 'Biometric not enrolled' });
    }

    // Verify ECDSA signature (device signs challenge with biometric-protected private key)
    const { createVerify } = require('crypto');
    const verify = createVerify('SHA256');
    verify.update(challenge);
    const isValid = verify.verify(
      { key: deviceRes.rows[0].biometric_public_key, format: 'der', type: 'spki' },
      Buffer.from(signature, 'base64')
    );
    if (!isValid) return res.status(401).json({ error: 'Biometric verification failed' });

    const userRes = await query(`SELECT id, role, full_name FROM users WHERE id=$1 AND is_active=TRUE`, [userId]);
    if (!userRes.rows[0]) return res.status(401).json({ error: 'User not found' });

    const { accessToken, refreshToken } = await issueTokens(userRes.rows[0], deviceId);

    await logEvent('auth.biometric.login', {
      userId, action: 'auth.biometric.login', metadata: { deviceId },
    });

    res.json({ success: true, accessToken, refreshToken, user: userRes.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
