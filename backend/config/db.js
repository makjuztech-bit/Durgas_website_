const path = require('path');
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
}
const { Pool } = require('pg');
const { translateSql, formatResult } = require('./sql');
const { validateDatabaseUrl } = require('./connectionString');
const { supabase, supabaseAdmin } = require('./supabaseClient');

let localDb = null;
try {
  localDb = require('./localDb');
} catch (e) {
  console.warn('[db] Local SQLite fallback unavailable in this environment:', e.message);
  localDb = null;
}

let useLocalFallback = false;
let poolInitError = null;
let connectionError = null;
let reconnectTimer = null;

let rawConnectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL || 'postgresql://postgres.xuoedlqfzlukddpspuls:Sabari%401412@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres';
let connectionString = (rawConnectionString || '').trim().replace(/^["']+|["']+$/g, '');

// Auto-map direct Supabase host (IPv6 only) or session pooler (5432 limit 15) to Supabase IPv4 Transaction Pooler (6543)
if (connectionString && (connectionString.includes('xuoedlqfzlukddpspuls.supabase.co') || connectionString.includes('aws-0-ap-southeast-2.pooler.supabase.com:5432'))) {
  connectionString = connectionString
    .replace(/@db\.xuoedlqfzlukddpspuls\.supabase\.co(:5432)?/g, '@aws-0-ap-southeast-2.pooler.supabase.com:6543')
    .replace(/@aws-0-ap-southeast-2\.pooler\.supabase\.com(:5432)?/g, '@aws-0-ap-southeast-2.pooler.supabase.com:6543')
    .replace(/\/\/postgres(?!\.xuoedlqfzlukddpspuls):/g, '//postgres.xuoedlqfzlukddpspuls:');
}

let pool = null;
if (connectionString) {
  try {
    connectionString = validateDatabaseUrl(connectionString);

    const sslConfig = () => {
      if (process.env.DB_SSL === 'false') return false;
      if (connectionString.includes('supabase') || process.env.DB_SSL === 'true') {
        return {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
        };
      }
      return false;
    };

    pool = new Pool({
      connectionString,
      ssl: sslConfig(),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '25000', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
    });

    pool.on('error', (err) => {
      console.error('[db pool error] Idle client error:', err.message);
    });

    const scheduleReconnect = () => {
      if (reconnectTimer || !pool) return;
      reconnectTimer = setTimeout(async () => {
        reconnectTimer = null;
        try {
          await pool.query('SELECT 1');
          console.log('[db] PostgreSQL connection re-established. Cloud database active.');
          useLocalFallback = false;
          connectionError = null;
        } catch (e) {
          connectionError = e.message;
          scheduleReconnect();
        }
      }, 5000);
    };

    const attemptConnect = (retries = 5, delay = 2000) => {
      if (!pool) return;
      pool.query('SELECT 1', (err) => {
        if (err) {
          connectionError = err.message;
          console.warn(`[db] PostgreSQL direct connection attempt failed (${err.message}). Retries remaining: ${retries}`);
          if (retries > 0) {
            setTimeout(() => attemptConnect(retries - 1, delay * 1.5), delay);
          } else {
            console.warn('[db] Cold start retries exhausted. Fallback active until background reconnect succeeds.');
            if (localDb) useLocalFallback = true;
            scheduleReconnect();
          }
        } else {
          connectionError = null;
          useLocalFallback = false;
          console.log('[db] Supabase/PostgreSQL database connected successfully.');
        }
      });
    };

    attemptConnect();
  } catch (err) {
    console.error('[db] Error configuring PostgreSQL connection pool:', err.message);
    poolInitError = err.message;
    pool = null;
  }
} else {
  console.warn('[db] Warning: DATABASE_URL is not set in environment variables.');
  if (localDb) useLocalFallback = true;
}

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

  // Critical for cloud persistence: All write queries (INSERT, UPDATE, DELETE) MUST go to persistent PostgreSQL
  const isWrite = /^\s*(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE)\b/i.test(sql);

  // If pool is configured and either we're not falling back OR this is a write query: try PostgreSQL first!
  if (pool && (!useLocalFallback || isWrite)) {
    const { text, values } = translateSql(sql, params);

    if (callback) {
      pool.query(text, values, (err, result) => {
        if (err) {
          if (isNetworkError(err) && localDb && !isWrite) {
            console.warn('[db] PostgreSQL network error on read, temporary fallback to SQLite:', err.message);
            useLocalFallback = true;
            return localDb.query(sql, params, callback);
          }
          return callback(err, null);
        }
        useLocalFallback = false;
        callback(null, formatResult(text, result));
      });
      return;
    }

    return pool.query(text, values)
      .then((result) => {
        useLocalFallback = false;
        return formatResult(text, result);
      })
      .catch((err) => {
        if (isNetworkError(err) && localDb && !isWrite) {
          console.warn('[db] PostgreSQL network error on read, temporary fallback to SQLite:', err.message);
          useLocalFallback = true;
          return localDb.query(sql, params);
        }
        throw err;
      });
  }

  // If pool is completely missing or read failed
  if (localDb) {
    return localDb.query(sql, params, callback);
  }

  const err = new Error('Database is not connected. Please ensure DATABASE_URL is configured in your Environment Variables.');
  if (callback) return callback(err, null);
  return Promise.reject(err);
};

const db = {
  query: executeQuery,
  pool,
  supabase,
  supabaseAdmin,
  localDb,
  ping: () => (useLocalFallback && localDb ? localDb.ping() : (pool ? pool.query('SELECT 1') : Promise.resolve())),
  getHealthInfo: async () => {
    let pgStatus = 'disconnected';
    let pgError = poolInitError || connectionError;
    let pgProductsCount = 0;
    if (pool) {
      try {
        const check = await pool.query('SELECT count(*) as count FROM products');
        pgStatus = 'connected';
        pgProductsCount = Number(check.rows[0]?.count || 0);
        useLocalFallback = false;
        pgError = null;
      } catch (e) {
        pgStatus = 'error';
        pgError = e.message;
      }
    }

    const hostMatch = connectionString.match(/@([^:/]+)(?::(\d+))?/);
    const hostInfo = hostMatch ? `${hostMatch[1]}:${hostMatch[2] || 5432}` : 'unknown';

    return {
      status: 'ok',
      database: pgStatus === 'connected' ? 'PostgreSQL (Supabase Cloud)' : 'Local SQLite Fallback',
      isUsingLocalFallback: useLocalFallback,
      postgres: {
        status: pgStatus,
        error: pgError,
        poolInitialized: Boolean(pool),
        productsCount: pgProductsCount,
        endpoint: hostInfo,
      },
      timestamp: new Date().toISOString()
    };
  },
  close: async () => {
    try { if (localDb) localDb.close(); } catch (e) {}
    try { if (pool) await pool.end(); } catch (e) {}
  },
  getConnection: (callback) => {
    if (useLocalFallback && localDb) {
      return localDb.getConnection(callback);
    }

    if (!pool) {
      if (localDb) return localDb.getConnection(callback);
      return callback(new Error('Database is not connected. Please configure DATABASE_URL in Vercel Environment Variables.'), null);
    }

    pool.connect((err, client, release) => {
      if (err) {
        if (isNetworkError(err) && localDb) {
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

module.exports = db;
