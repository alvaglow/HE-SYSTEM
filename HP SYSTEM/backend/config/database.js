// config/database.js — PostgreSQL connection pool (TLS enforced)
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
});

// Set per-request RLS user context
pool.on('connect', (client) => {
  client.query("SET app.current_user_id = ''");
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error', err.message);
});

/**
 * Execute query with RLS user context set
 * Always uses parameterized queries — never string interpolation
 */
const query = async (text, params, userId = null) => {
  const client = await pool.connect();
  try {
    if (userId) {
      await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
    }
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

/**
 * Transaction helper — auto-rollback on error
 */
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, withTransaction };
