const path = require('path');
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
}
const { Pool } = require('pg');
const { translateSql, formatResult } = require('./sql');
const { validateDatabaseUrl } = require('./connectionString');
const { supabase, supabaseAdmin } = require('./supabaseClient');

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be configured for the PostgreSQL database.');
}
validateDatabaseUrl(connectionString);

const sslConfig = () => {
  if (process.env.DB_SSL === 'false') return false;
  if (connectionString.includes('supabase') || process.env.DB_SSL === 'true') {
    return {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
    };
  }
  return false;
};

const pool = new Pool({
  connectionString,
  ssl: sslConfig(),
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '10000', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
});

// Prevent unhandled idle client errors from crashing the Node.js process
pool.on('error', (err) => {
  console.error('[db pool error] Idle client error:', err.message);
});

const localDb = require('./localDb');

let useLocalFallback = false;

const isNetworkError = (err) => {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toLowerCase();
  return (
    code === 'enoent' ||
    code === 'enotfound' ||
    code === 'econnrefused' ||
    code === 'etimedout' ||
    code === 'enetunreach' ||
    msg.includes('getaddrinfo') ||
    msg.includes('timeout') ||
    msg.includes('connection terminated') ||
    msg.includes('connect econnrefused')
  );
};

const executeQuery = (sql, params = [], callback) => {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  if (useLocalFallback) {
    return localDb.query(sql, params, callback);
  }

  const { text, values } = translateSql(sql, params);

  if (callback) {
    pool.query(text, values, (err, result) => {
      if (err) {
        if (isNetworkError(err)) {
          console.warn('[db] PostgreSQL network error, seamlessly switching to local storage:', err.message);
          useLocalFallback = true;
          return localDb.query(sql, params, callback);
        }
        return callback(err, null);
      }
      callback(null, formatResult(text, result));
    });
    return;
  }

  return pool.query(text, values)
    .then((result) => formatResult(text, result))
    .catch((err) => {
      if (isNetworkError(err)) {
        console.warn('[db] PostgreSQL network error, seamlessly switching to local storage:', err.message);
        useLocalFallback = true;
        return localDb.query(sql, params);
      }
      throw err;
    });
};

const db = {
  query: executeQuery,
  pool,
  supabase,
  supabaseAdmin,
  localDb,
  ping: () => (useLocalFallback ? localDb.ping() : pool.query('SELECT 1')),
  close: async () => {
    try { localDb.close(); } catch (e) {}
    try { await pool.end(); } catch (e) {}
  },
  getConnection: (callback) => {
    if (useLocalFallback) {
      return localDb.getConnection(callback);
    }

    pool.connect((err, client, release) => {
      if (err) {
        if (isNetworkError(err)) {
          console.warn('[db] PostgreSQL connection failed, switching to local connection:', err.message);
          useLocalFallback = true;
          return localDb.getConnection(callback);
        }
        return callback(err, null);
      }

      const connection = {
        query: (sql, params, queryCallback) => {
          if (typeof params === 'function') {
            queryCallback = params;
            params = [];
          }

          const { text, values } = translateSql(sql, params);
          client.query(text, values, (queryErr, result) => {
            if (queryCallback) {
              queryCallback(queryErr, result && formatResult(text, result));
            }
          });
        },
        release: () => release(),
      };

      callback(null, connection);
    });
  },
};

pool.query('SELECT 1', (err) => {
  if (err) {
    console.warn('Supabase/Postgres direct connection unavailable (' + err.message + '). Active fallback: local resilient SQLite database.');
    useLocalFallback = true;
  } else {
    console.log('Supabase/Postgres database connected.');
  }
});

module.exports = db;

