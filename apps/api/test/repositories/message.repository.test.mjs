import test from 'node:test';
import assert from 'node:assert';
import { _clearMemoryStore, createMessage, findSimilarMessages, findByConversationId } from '../../src/repositories/message.repository.mjs';
import { createConversation } from '../../src/repositories/conversation.repository.mjs';

test('Message Repository RAG Semantic Search and Tenant Isolation', async (t) => {
  t.beforeEach(() => {
    _clearMemoryStore();
  });

  await t.test('createMessage should store message without embedding returned in payload', async () => {
    // Arrange
    const params = {
      conversationId: 'conv-123',
      role: 'user',
      content: 'Hello world',
      embedding: Array(1536).fill(0.1)
    };

    // Act
    const result = await createMessage(params);

    // Assert
    assert.ok(result.id);
    assert.strictEqual(result.conversationId, 'conv-123');
    assert.strictEqual(result.content, 'Hello world');
    assert.strictEqual(result.embedding, undefined);
  });

  await t.test('findSimilarMessages enforces tenant isolation (no context leak between users)', async () => {
    // Arrange
    const userIdA = 'user-aaa';
    const userIdB = 'user-bbb';
    
    const convA = await createConversation({ userId: userIdA, title: 'Chat A' });
    const convB = await createConversation({ userId: userIdB, title: 'Chat B' });

    const sharedVector = Array(1536).fill(0.2); // Exact same thought vector
    
    await createMessage({
      conversationId: convA.id,
      role: 'user',
      content: 'User A secret key is 42',
      embedding: sharedVector
    });

    await createMessage({
      conversationId: convB.id,
      role: 'user',
      content: 'User B secret key is 99',
      embedding: sharedVector
    });

    // Act
    const results = await findSimilarMessages(userIdA, sharedVector, 5, 0.60);

    // Assert
    assert.strictEqual(results.length, 1, 'Should only return 1 message for User A');
    assert.strictEqual(results[0].content, 'User A secret key is 42');
    assert.strictEqual(results[0].conversationId, convA.id);
  });

  await t.test('findSimilarMessages enforces minSimilarity threshold', async () => {
    // Arrange
    const userId = 'user-ccc';
    const conv = await createConversation({ userId, title: 'Similarity Test' });

    const queryVector = Array(1536).fill(0.5);
    
    // Very similar vector (exact match, sim = 1)
    await createMessage({
      conversationId: conv.id,
      role: 'user',
      content: 'Highly relevant',
      embedding: queryVector
    });

    // Orthogonal vector (dot product = 0, sim = 0)
    const orthogonalVector = Array(1536).fill(0);
    for (let i = 0; i < 768; i++) orthogonalVector[i] = 1;
    for (let i = 768; i < 1536; i++) orthogonalVector[i] = -1;

    await createMessage({
      conversationId: conv.id,
      role: 'user',
      content: 'Not relevant at all',
      embedding: orthogonalVector
    });

    // Act
    const results = await findSimilarMessages(userId, queryVector, 5, 0.60);

    // Assert
    assert.strictEqual(results.length, 1, 'Should only return messages above 0.60 similarity');
    assert.strictEqual(results[0].content, 'Highly relevant');
    // Ensure no embedding is leaked in the RAG retrieval response
    assert.strictEqual(results[0].embedding, undefined);
  });
});
