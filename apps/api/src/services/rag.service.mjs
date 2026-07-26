import { loadConfig } from '../config.mjs';
import { findSimilarMessages } from '../repositories/message.repository.mjs';

/**
 * Generates an embedding for the given text using OpenAI text-embedding-3-small.
 * @param {string} text 
 * @returns {Promise<Array<number>|null>} The embedding array, or null if failed.
 */
export async function generateEmbedding(text) {
  try {
    const config = loadConfig();
    const model = config.model;
    
    if (!model.baseUrl) {
      return null;
    }

    const headers = { "content-type": "application/json" };
    if (model.apiKey) headers.authorization = `Bearer ${model.apiKey}`;

    const response = await fetch(`${model.baseUrl}/embeddings`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
      signal: AbortSignal.timeout(model.timeoutMs),
    });

    if (!response.ok) {
      console.error(`generateEmbedding error: OpenAI returned status ${response.status}`);
      return null;
    }

    const payload = await response.json();
    return payload?.data?.[0]?.embedding || null;
  } catch (error) {
    console.error("generateEmbedding error:", error.message);
    return null;
  }
}

/**
 * Retrieves relevant context based on vector search.
 * @param {Object} params 
 * @param {string} params.userId 
 * @param {string} params.queryText 
 * @param {number} [params.limit=5] 
 * @param {number} [params.minSimilarity=0.60] 
 * @param {Function} [params._findSimilarMessages] Dependency injection for testing.
 * @returns {Promise<Array<Object>>} 
 */
export async function retrieveRelevantContext({ 
  userId, 
  queryText, 
  limit = 5, 
  minSimilarity = 0.60,
  _findSimilarMessages = findSimilarMessages
}) {
  try {
    const embedding = await generateEmbedding(queryText);
    if (!embedding) {
      return [];
    }
    
    const similarMessages = await _findSimilarMessages({ userId, embedding, limit, minSimilarity });
    return similarMessages || [];
  } catch (error) {
    console.error("retrieveRelevantContext error:", error.message);
    return [];
  }
}
