/**
 * System Verification Script
 * Run: node verify-system.js
 * This will check all components and report their status
 */

const fs = require('fs');
const path = require('path');

console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                    HED SYSTEM — SYSTEM VERIFICATION                      ║
╚══════════════════════════════════════════════════════════════════════════╝
`);

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function pass(msg) {
  console.log(`✅ ${msg}`);
  checks.passed++;
}

function fail(msg) {
  console.log(`❌ ${msg}`);
  checks.failed++;
}

function warn(msg) {
  console.log(`⚠️  ${msg}`);
  checks.warnings++;
}

// Check 1: Critical Files Exist
console.log('\n📁 Checking Critical Files...');
const criticalFiles = [
  'HP System/backend/server.js',
  'HP System/backend/schema.sql',
  'HP System/backend/config/database.js',
  'HP System/backend/middleware/auth.js',
  'HP System/backend/middleware/security.js',
  'HP System/backend/routes/auth.js',
  'HP System/backend/routes/payments.js',
  'HP System/backend/routes/attendance.js',
  'HP System/backend/services/zalopay.js',
  'HP System/backend/services/vnpay.js',
  'HP System/backend/services/momo.js',
  'HP System/backend/services/email.js',
  'HP System/backend/services/pdf.js',
  'HP System/backend/services/upload.js',
  'HP System/backend/services/notifications.js',
  'HP System/server-config/generate-env.js',
  '.env'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    pass(`${file} exists`);
  } else {
    fail(`${file} is MISSING`);
  }
});

// Check 2: Environment Variables
console.log('\n🔐 Checking Environment Variables...');
require('dotenv').config();

const requiredEnvVars = [
  'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
  'JWT_PRIVATE_KEY_PATH', 'JWT_PUBLIC_KEY_PATH', 'JWT_ISSUER',
  'MASTER_ENCRYPTION_KEY', 'LIVENESS_SECRET',
  'ZALOPAY_APP_ID', 'ZALOPAY_KEY1', 'ZALOPAY_KEY2',
  'REDIS_URL'
];

requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    pass(`${envVar} is set`);
  } else {
    warn(`${envVar} is NOT set (may use defaults)`);
  }
});

// Check 3: Database Connection
console.log('\n🗄️  Checking Database Connection...');
try {
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: false,
    connectionTimeoutMillis: 2000
  });

  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      fail(`Database connection failed: ${err.message}`);
    } else {
      pass(`Database connected successfully at ${res.rows[0].now}`);
    }
    pool.end();
  });
} catch (e) {
  fail(`Database check error: ${e.message}`);
}

// Check 4: JWT Keys
console.log('\n🔑 Checking JWT Keys...');
const jwtPrivateKeyPath = path.join(__dirname, 'HP System/backend/keys/jwt-private.pem');
const jwtPublicKeyPath = path.join(__dirname, 'HP System/backend/keys/jwt-public.pem');
if (fs.existsSync(jwtPrivateKeyPath) && fs.existsSync(jwtPublicKeyPath)) {
  pass('JWT keys exist');
} else {
  warn('JWT keys NOT found. Run: node scripts/generate-keys.js');
}

// Check 5: Dependencies
console.log('\n📦 Checking Dependencies...');
try {
  require('express');
  require('pg');
  require('jsonwebtoken');
  require('bcrypt');
  require('helmet');
  require('cors');
  require('express-rate-limit');
  require('winston');
  require('multer');
  require('axios');
  pass('All main dependencies are installed');
} catch (e) {
  fail(`Missing dependency: ${e.message}`);
}

// Summary
console.log(`
══════════════════════════════════════════════════════════════════════════════
                              VERIFICATION SUMMARY
══════════════════════════════════════════════════════════════════════════════
  ✅ Passed:   ${checks.passed}
  ❌ Failed:   ${checks.failed}
  ⚠️  Warnings: ${checks.warnings}

${checks.failed === 0 ? '🎉 SYSTEM IS READY FOR LAUNCH!' : '⚠️  Please fix the failed checks before launching.'}
══════════════════════════════════════════════════════════════════════════════
`);
