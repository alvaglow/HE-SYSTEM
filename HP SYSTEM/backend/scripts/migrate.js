// scripts/migrate.js — Apply schema.sql to the configured PostgreSQL database
// Usage: npm run migrate   (reads DB_* from .env)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const schemaPath = path.join(__dirname, '..', 'schema.sql');

async function main() {
  if (!fs.existsSync(schemaPath)) {
    console.error('✖ schema.sql not found at', schemaPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const pool = new Pool({
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
    connectionTimeoutMillis: 8000,
  });

  console.log(`\nHP System migrate → ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql); // schema.sql is idempotent (IF NOT EXISTS / CREATE EXTENSION IF NOT EXISTS)
    await client.query('COMMIT');

    const { rows } = await client.query(
      "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'"
    );
    console.log(`✅ Migration applied. Public tables now: ${rows[0].n}\n`);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n✖ Migration failed (rolled back):', e.message, '\n');
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error('✖', e.message); process.exit(1); });
