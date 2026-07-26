import test from 'node:test';
import assert from 'node:assert';
import { retrieveRelevantContext } from '../../src/services/rag.service.mjs';

test('rag.service', async (t) => {
  let originalBaseUrl, originalModelName;

  t.beforeEach(() => {
    originalBaseUrl = process.env.MODEL_API_BASE_URL;
    originalModelName = process.env.MODEL_NAME;
    process.env.MODEL_API_BASE_URL = 'http://test-model-api';
    process.env.MODEL_NAME = 'test-model';
  });

  t.afterEach(() => {
    process.env.MODEL_API_BASE_URL = originalBaseUrl;
    process.env.MODEL_NAME = originalModelName;
  });

  await t.test('retrieveRelevantContext returns empty array on DB failure', async () => {
    // Arrange
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.1, 0.2] }] })
    });

    const mockFindSimilar = async () => {
      throw new Error('DB Error');
    };

    // Act
    const result = await retrieveRelevantContext({
      userId: 'test-user',
      queryText: 'Hello',
      _findSimilarMessages: mockFindSimilar,
    });

    // Assert
    assert.deepStrictEqual(result, []);

    // Restore
    global.fetch = originalFetch;
  });

  await t.test('retrieveRelevantContext returns empty array on network failure', async () => {
    // Arrange
    const originalFetch = global.fetch;
    global.fetch = async () => {
      throw new Error('Network Error');
    };

    const mockFindSimilar = async () => {
      return [{ id: '1', content: 'should not be called' }];
    };

    // Act
    const result = await retrieveRelevantContext({
      userId: 'test-user',
      queryText: 'Hello',
      _findSimilarMessages: mockFindSimilar,
    });

    // Assert
    assert.deepStrictEqual(result, []);

    // Restore
    global.fetch = originalFetch;
  });

  await t.test('retrieveRelevantContext returns context on success', async () => {
    // Arrange
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] })
    });

    const mockContext = [{ id: '1', content: 'hello world' }];
    const mockFindSimilar = async () => mockContext;

    // Act
    const result = await retrieveRelevantContext({
      userId: 'test-user',
      queryText: 'Hello',
      _findSimilarMessages: mockFindSimilar,
    });

    // Assert
    assert.deepStrictEqual(result, mockContext);

    // Restore
    global.fetch = originalFetch;
  });
});
