import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { runMigrations } from '../../src/repositories/migrations.mjs';
import * as db from '../../src/repositories/db.mjs';

describe('Migrations Repository', () => {
  beforeEach(async () => {
    await db.closePool();
  });

  test('runMigrations should skip when database is not connected (bypass transparente en modo fallback)', async (t) => {
    // Arrange
    process.env.NODE_ENV = 'test';
    await db.getPool({}); // Ensure pool is initialized in test mode (disconnected)
    
    let logOutput = '';
    const originalLog = console.log;
    console.log = (msg) => {
      logOutput += msg;
    };

    // Act
    await runMigrations({});

    // Assert
    assert.strictEqual(db.isDatabaseConnected(), false);
    assert.match(logOutput, /Database disconnected\. Skipping migrations\./);

    // Cleanup
    console.log = originalLog;
  });
});
