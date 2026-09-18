const { Pool } = require('pg');
const { parse } = require('pg-connection-string');
require('dotenv').config();

function buildPoolConfig() {
  const rawUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL;

  if (rawUrl) {
    const trimmed = rawUrl.trim().replace(/^["']|["']$/g, '');
    const parsed = parse(trimmed);

    const isRemote =
      parsed.host &&
      !parsed.host.includes('localhost') &&
      !parsed.host.includes('127.0.0.1');

    return {
      host: parsed.host,
      port: Number(parsed.port) || 5432,
      user: parsed.user || 'postgres',
      password: parsed.password || undefined,
      database: parsed.database || 'postgres',
      ssl: isRemote ? { rejectUnauthorized: false } : false,
      max: Number(process.env.DB_POOL_MAX) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
  }

  const host = process.env.DB_HOST || '127.0.0.1';
  const isRemote = !host.includes('localhost') && !host.includes('127.0.0.1');

  return {
    host,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'stock_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD !== undefined ? String(process.env.DB_PASSWORD) : undefined,
    ssl: isRemote || process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: Number(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

function getMaskedConnectionInfo() {
  const cfg = buildPoolConfig();
  return `postgres://${cfg.user}:***@${cfg.host}:${cfg.port}/${cfg.database}`;
}

const pool = new Pool(buildPoolConfig());

pool.on('error', (err) => {
  console.error('[DATABASE ERROR] Unexpected PostgreSQL client error:', err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

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
