import crypto from 'node:crypto';
import { isDatabaseConnected, query } from './db.mjs';

// In-Memory Fallback
const usersStore = new Map();

/**
 * Crea un nuevo usuario en persistencia.
 * @param {Object} userData
 * @param {string} userData.username
 * @param {string} userData.passwordHash
 * @returns {Promise<{ id: string, username: string, password_hash: string, created_at: Date }>}
 */
export async function createUser({ username, passwordHash }) {
  if (isDatabaseConnected()) {
    const res = await query(
      `INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *`,
      [username, passwordHash]
    );
    return res.rows[0];
  }

  // In-Memory Fallback
  for (const user of usersStore.values()) {
    if (user.username === username) {
      throw new Error(`User with username ${username} already exists`);
    }
  }

  const id = crypto.randomUUID();
  const created_at = new Date();
  
  const newUser = {
    id,
    username,
    password_hash: passwordHash,
    created_at,
  };

  usersStore.set(id, newUser);
  return newUser;
}

/**
 * Busca un usuario por su nombre de usuario.
 * @param {string} username
 * @returns {Promise<{ id: string, username: string, password_hash: string, created_at: Date }|null>}
 */
export async function findByUsername(username) {
  if (isDatabaseConnected()) {
    const res = await query(`SELECT * FROM users WHERE username = $1`, [username]);
    return res.rows[0] || null;
  }

  // In-Memory Fallback
  for (const user of usersStore.values()) {
    if (user.username === username) {
      return user;
    }
  }
  return null;
}

/**
 * Busca un usuario por su UUID id.
 * @param {string} id - UUID string
 * @returns {Promise<{ id: string, username: string, password_hash: string, created_at: Date }|null>}
 */
export async function findById(id) {
  if (isDatabaseConnected()) {
    const res = await query(`SELECT * FROM users WHERE id = $1`, [id]);
    return res.rows[0] || null;
  }

  // In-Memory Fallback
  return usersStore.get(id) || null;
}

// Internal function to reset state for testing
export function _clearUsersStore() {
  usersStore.clear();
}
