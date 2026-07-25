import { randomUUID } from 'crypto';
import { isDatabaseConnected, query } from './db.mjs';

let memoryStore = [];

/**
 * Creates a new conversation.
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.title
 * @returns {Promise<Object>} The created conversation.
 */
export async function createConversation({ userId, title }) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  
  if (isDatabaseConnected()) {
    const text = 'INSERT INTO conversations (id, user_id, title, created_at) VALUES ($1, $2, $3, $4) RETURNING id, user_id as "userId", title, created_at as "createdAt"';
    const values = [id, userId, title, createdAt];
    const { rows } = await query(text, values);
    return rows[0];
  } else {
    const newConversation = { id, userId, title, createdAt };
    memoryStore.push(newConversation);
    return newConversation;
  }
}

/**
 * Finds all conversations for a specific user.
 * @param {string} userId 
 * @returns {Promise<Array>} List of conversations.
 */
export async function findByUserId(userId) {
  if (isDatabaseConnected()) {
    const text = 'SELECT id, user_id as "userId", title, created_at as "createdAt" FROM conversations WHERE user_id = $1 ORDER BY created_at DESC';
    const { rows } = await query(text, [userId]);
    return rows;
  } else {
    return memoryStore
      .filter(c => c.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

/**
 * Finds a conversation by its ID.
 * @param {string} id 
 * @returns {Promise<Object|null>} The conversation or null if not found.
 */
export async function findById(id) {
  if (isDatabaseConnected()) {
    const text = 'SELECT id, user_id as "userId", title, created_at as "createdAt" FROM conversations WHERE id = $1';
    const { rows } = await query(text, [id]);
    return rows[0] || null;
  } else {
    return memoryStore.find(c => c.id === id) || null;
  }
}

/**
 * Deletes a conversation by its ID, enforcing tenant isolation with userId.
 * @param {string} id 
 * @param {string} userId 
 * @returns {Promise<boolean>} True if deleted, false otherwise.
 */
export async function deleteById(id, userId) {
  if (isDatabaseConnected()) {
    const text = 'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id';
    const { rows } = await query(text, [id, userId]);
    return rows.length > 0;
  } else {
    const index = memoryStore.findIndex(c => c.id === id && c.userId === userId);
    if (index !== -1) {
      memoryStore.splice(index, 1);
      return true;
    }
    return false;
  }
}
