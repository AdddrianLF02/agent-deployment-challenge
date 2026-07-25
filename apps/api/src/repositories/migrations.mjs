import { isDatabaseConnected, query } from './db.mjs';

/**
 * Executes database migrations for pgvector data model.
 * @param {Object} config - The application configuration object.
 * @returns {Promise<void>}
 */
export async function runMigrations(config) {
  if (!isDatabaseConnected()) {
    console.log('[Migrations] Database disconnected. Skipping migrations.');
    return;
  }

  console.log('[Migrations] Running migrations...');

  try {
    await query('CREATE EXTENSION IF NOT EXISTS vector;');
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        embedding vector(1536),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS messages_embedding_hnsw_idx 
      ON messages 
      USING hnsw (embedding vector_cosine_ops);
    `);

    console.log('[Migrations] Migrations completed successfully.');
  } catch (error) {
    console.error('[Migrations] Failed to run migrations:', error);
    throw error;
  }
}
