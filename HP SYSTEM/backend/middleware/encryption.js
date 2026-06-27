// middleware/encryption.js — AES-256-GCM per-user encryption (Decree 13/2023)
const crypto = require('crypto');
const { query } = require('../config/database');

const ALGO      = 'aes-256-gcm';
const IV_LEN    = 12;  // 96-bit IV for GCM
const TAG_LEN   = 16;  // 128-bit auth tag
const MASTER_KEY = Buffer.from(process.env.MASTER_ENCRYPTION_KEY, 'hex');

// ── KEY DERIVATION ────────────────────────────────────────────
// Each user gets a unique Data Encryption Key (DEK)
// DEK is encrypted with the Master Key (KEK) using AES-256-GCM
// This enables key rotation without re-encrypting all data

const encryptDEK = (dek) => {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, MASTER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(dek), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}.${encrypted.toString('hex')}.${tag.toString('hex')}`;
};

const decryptDEK = (encryptedDEK) => {
  const [ivHex, dataHex, tagHex] = encryptedDEK.split('.');
  const iv = Buffer.from(ivHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, MASTER_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
};

// ── USER KEY MANAGEMENT ───────────────────────────────────────

const createUserKey = async (userId) => {
  const dek = crypto.randomBytes(32);  // 256-bit DEK
  const keyId = crypto.randomUUID();
  const encryptedDEK = encryptDEK(dek);
  await query(
    `INSERT INTO encryption_keys(id, user_id, encrypted_key) VALUES($1,$2,$3)
     ON CONFLICT(user_id) DO UPDATE SET encrypted_key=$3, rotated_at=NOW()`,
    [keyId, userId, encryptedDEK]
  );
  return { keyId, dek };
};

const getUserKey = async (userId) => {
  const res = await query('SELECT encrypted_key FROM encryption_keys WHERE user_id=$1', [userId]);
  if (!res.rows[0]) throw new Error(`No encryption key for user ${userId}`);
  return decryptDEK(res.rows[0].encrypted_key);
};

// ── FIELD-LEVEL ENCRYPTION ───────────────────────────────────

const encryptField = (plaintext, dek) => {
  if (!plaintext) return null;
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, dek, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}.${encrypted.toString('hex')}.${tag.toString('hex')}`;
};

const decryptField = (ciphertext, dek) => {
  if (!ciphertext || !ciphertext.startsWith('enc:')) return ciphertext; // unencrypted legacy
  const [ivHex, dataHex, tagHex] = ciphertext.slice(4).split('.');
  const iv   = Buffer.from(ivHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const tag  = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, dek, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};

// ── PII HELPERS ───────────────────────────────────────────────

const savePII = async (userId, piiData) => {
  const { dek, keyId } = await createUserKey(userId);
  const encrypted = {
    full_name:    encryptField(piiData.fullName, dek),
    phone:        encryptField(piiData.phone, dek),
    address:      encryptField(piiData.address, dek),
    date_of_birth:encryptField(piiData.dob, dek),
    national_id:  encryptField(piiData.nationalId, dek),
    encryption_key_id: keyId,
  };
  await query(
    `INSERT INTO user_pii(user_id, full_name, phone, address, date_of_birth, national_id, encryption_key_id)
     VALUES($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT(user_id) DO UPDATE
     SET full_name=$2, phone=$3, address=$4, date_of_birth=$5, national_id=$6, updated_at=NOW()`,
    [userId, encrypted.full_name, encrypted.phone, encrypted.address,
     encrypted.date_of_birth, encrypted.national_id, encrypted.encryption_key_id]
  );
};

const readPII = async (userId) => {
  const dek = await getUserKey(userId);
  const res = await query('SELECT * FROM user_pii WHERE user_id=$1', [userId]);
  if (!res.rows[0]) return null;
  const row = res.rows[0];
  return {
    fullName:   decryptField(row.full_name, dek),
    phone:      decryptField(row.phone, dek),
    address:    decryptField(row.address, dek),
    dob:        decryptField(row.date_of_birth, dek),
    nationalId: decryptField(row.national_id, dek),
  };
};

// ── MASK FOR LOGGING (never log raw PII) ─────────────────────
const maskPhone = (phone) => {
  if (!phone || phone.length < 4) return '***';
  return `***${phone.slice(-4)}`;
};

const maskEmail = (email) => {
  if (!email) return '***';
  const [user, domain] = email.split('@');
  return `${user[0]}***@${domain}`;
};

// ── RIGHT TO BE FORGOTTEN (Decree 13 — 60-day soft delete) ──
const scheduleDataDeletion = async (userId) => {
  await query(
    `UPDATE users SET status='deleted', deleted_at=NOW() WHERE id=$1`,
    [userId]
  );
  // Hard delete scheduled via cron after 60 days
};

module.exports = {
  encryptField, decryptField,
  savePII, readPII,
  createUserKey, getUserKey,
  maskPhone, maskEmail,
  scheduleDataDeletion,
};
