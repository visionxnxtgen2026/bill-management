const { Pool } = require('pg');
require('dotenv').config();

function buildPoolConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    const isRemote =
      !connectionString.includes('localhost') &&
      !connectionString.includes('127.0.0.1');

    return {
      connectionString,
      ssl: isRemote ? { rejectUnauthorized: false } : false,
      max: Number(process.env.DB_POOL_MAX) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
  }

  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'stock_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD !== undefined ? String(process.env.DB_PASSWORD) : undefined,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: Number(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

/**
 * Returns a masked connection string for safe diagnostic logging.
 */
function getMaskedConnectionInfo() {
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname;
      const port = parsed.port || '5432';
      const db = parsed.pathname.replace(/^\//, '');
      const user = parsed.username || 'postgres';
      return `postgres://${user}:***@${host}:${port}/${db}`;
    } catch {
      return 'postgres://***:***@[configured-database]';
    }
  }
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = process.env.DB_PORT || 5432;
  const db = process.env.DB_NAME || 'stock_management';
  const user = process.env.DB_USER || 'postgres';
  return `postgres://${user}:***@${host}:${port}/${db}`;
}

const pool = new Pool(buildPoolConfig());

pool.on('error', (err) => {
  // A background/idle client error should never crash the whole process or expose secrets.
  console.error('[DATABASE ERROR] Unexpected PostgreSQL client error:', err.message);
});

/**
 * Run a single parameterized query.
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Run a callback inside a PostgreSQL transaction.
 * Automatically BEGIN / COMMIT / ROLLBACK.
 */
async function withTransaction(callback) {
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
}

module.exports = { pool, query, withTransaction, getMaskedConnectionInfo };
