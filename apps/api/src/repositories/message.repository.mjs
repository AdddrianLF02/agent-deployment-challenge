import { randomUUID } from 'crypto';
import { isDatabaseConnected, query } from './db.mjs';
import { findByUserId } from './conversation.repository.mjs';

let memoryStore = [];

/**
 * Creates a new message.
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.role
 * @param {string} params.content
 * @param {Array<number>} params.embedding
 * @returns {Promise<Object>} The created message.
 */
export async function createMessage({ conversationId, role, content, embedding }) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  if (isDatabaseConnected()) {
    const embeddingStr = `[${embedding.join(',')}]`;
    const text = 'INSERT INTO messages (id, conversation_id, role, content, embedding, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, conversation_id as "conversationId", role, content, created_at as "createdAt"';
    const values = [id, conversationId, role, content, embeddingStr, createdAt];
    const { rows } = await query(text, values);
    return rows[0];
  } else {
    const newMessage = { id, conversationId, role, content, embedding, createdAt };
    memoryStore.push(newMessage);
    const { embedding: _, ...messageWithoutEmbedding } = newMessage;
    return messageWithoutEmbedding;
  }
}

/**
 * Finds all messages for a specific conversation.
 * @param {string} conversationId 
 * @returns {Promise<Array>} List of messages.
 */
export async function findByConversationId(conversationId) {
  if (isDatabaseConnected()) {
    const text = 'SELECT id, conversation_id as "conversationId", role, content, created_at as "createdAt" FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC';
    const { rows } = await query(text, [conversationId]);
    return rows;
  } else {
    return memoryStore
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map(m => {
        const { embedding, ...rest } = m;
        return rest;
      });
  }
}

/**
 * Calculates cosine similarity between two vectors.
 * @param {Array<number>} vecA 
 * @param {Array<number>} vecB 
 * @returns {number}
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Finds similar messages using vector search, enforcing tenant isolation.
 * @param {string} userId 
 * @param {Array<number>} queryEmbedding 
 * @param {number} [topK=5] 
 * @param {number} [minSimilarity=0.60] 
 * @returns {Promise<Array>} List of similar messages.
 */
export async function findSimilarMessages({ userId, embedding, limit = 5, minSimilarity = 0.60 }) {
  if (isDatabaseConnected()) {
    const embeddingStr = `[${embedding.join(',')}]`;
    const text = `
      SELECT 
        m.id, 
        m.conversation_id as "conversationId", 
        m.role, 
        m.content, 
        m.created_at as "createdAt",
        1 - (m.embedding <=> $1::vector) as similarity
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.user_id = $2
      AND 1 - (m.embedding <=> $1::vector) >= $3
      ORDER BY m.embedding <=> $1::vector ASC
      LIMIT $4
    `;
    const { rows } = await query(text, [embeddingStr, userId, minSimilarity, limit]);
    return rows;
  } else {
    // Fallback: In-memory JS vector search
    const userConversations = await findByUserId(userId);
    const userConversationIds = new Set(userConversations.map(c => c.id));
    
    const scoredMessages = [];
    for (const msg of memoryStore) {
      if (userConversationIds.has(msg.conversationId) && msg.embedding) {
        const similarity = cosineSimilarity(embedding, msg.embedding);
        if (similarity >= minSimilarity) {
          scoredMessages.push({ ...msg, similarity });
        }
      }
    }
    
    return scoredMessages
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(m => {
        const { embedding, ...rest } = m;
        return rest;
      });
  }
}

export function _clearMemoryStore() {
  memoryStore = [];
}
