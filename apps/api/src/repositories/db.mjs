import pg from 'pg';

const { Pool } = pg;

let pool = null;
let _isConnected = false;

/**
 * Initializes and returns the database pool.
 * @param {Object} config - The application configuration object.
 * @returns {Promise<Object>} The database pool instance.
 */
export async function getPool(config) {
  if (pool) return pool;

  if (process.env.NODE_ENV === 'test') {
    _isConnected = false;
    pool = {
      query: async () => { throw new Error('Database disconnected'); },
      end: async () => {},
      on: () => {}
    };
    return pool;
  }

  try {
    const pgConfig = config?.postgres || {};
    pool = new Pool({
      host: pgConfig.host,
      port: pgConfig.port,
      database: pgConfig.database,
      user: pgConfig.user,
      password: pgConfig.password,
    });
    
    // Test the connection
    const client = await pool.connect();
    client.release();
    _isConnected = true;
  } catch (error) {
    console.warn('[DB] Failed to connect to database. Falling back to disconnected state.', error.message);
    _isConnected = false;
    // Fallback pool to prevent crashes
    pool = {
      query: async () => { throw new Error('Database disconnected'); },
      end: async () => {},
      on: () => {}
    };
  }

  return pool;
}

/**
 * Returns whether the database is successfully connected.
 * @returns {boolean}
 */
export function isDatabaseConnected() {
  return _isConnected;
}

/**
 * Executes a database query.
 * @param {string} text - The SQL query text.
 * @param {Array} params - The query parameters.
 * @returns {Promise<Object>} The query result.
 */
export async function query(text, params) {
  if (!pool) {
    throw new Error('Database pool not initialized. Call getPool(config) first.');
  }
  return pool.query(text, params);
}

/**
 * Closes the database pool.
 * @returns {Promise<void>}
 */
export async function closePool() {
  if (pool && typeof pool.end === 'function') {
    await pool.end();
  }
  pool = null;
  _isConnected = false;
}
