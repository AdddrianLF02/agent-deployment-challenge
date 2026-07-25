import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { getPool, isDatabaseConnected, closePool, query } from '../../src/repositories/db.mjs';

describe('Database Repository', () => {
  beforeEach(async () => {
    await closePool();
  });

  test('should return false for isDatabaseConnected in test environment', async () => {
    // Arrange
    process.env.NODE_ENV = 'test';
    const fakeConfig = {
      postgres: {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test'
      }
    };
    
    // Act
    await getPool(fakeConfig);
    const connected = isDatabaseConnected();
    
    // Assert
    assert.strictEqual(connected, false);
  });
  
  test('should throw error when querying disconnected db in test mode without crashing', async () => {
    // Arrange
    process.env.NODE_ENV = 'test';
    const fakeConfig = {};
    await getPool(fakeConfig);
    
    // Act & Assert
    await assert.rejects(
      async () => {
        await query('SELECT 1');
      },
      /Database disconnected/
    );
  });
});
