// scripts/generate-keys.js — Generate RSA-4096 key pair for JWT RS256
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, '../keys');
if (!fs.existsSync(keysDir)) fs.mkdirSync(keysDir, { mode: 0o700 });

console.log('Generating RSA-4096 key pair...');
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 4096,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

fs.writeFileSync(path.join(keysDir, 'private.pem'), privateKey, { mode: 0o600 });
fs.writeFileSync(path.join(keysDir, 'public.pem'),  publicKey,  { mode: 0o644 });

const masterKey = crypto.randomBytes(32).toString('hex');
console.log('\n✅ Keys generated: keys/private.pem  keys/public.pem');
console.log('\nAdd to .env:');
console.log(`MASTER_ENCRYPTION_KEY=${masterKey}`);
