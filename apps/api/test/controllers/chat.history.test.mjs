import test from 'node:test';
import assert from 'node:assert';
import { handleGetHistory } from '../../src/controllers/chat.controller.mjs';
import { ExpressMother } from '../factories/express.mothers.mjs';
import { createConversation } from '../../src/repositories/conversation.repository.mjs';
import { createMessage, _clearMemoryStore } from '../../src/repositories/message.repository.mjs';

test('Chat History Controller', async (t) => {
  t.beforeEach(() => {
    _clearMemoryStore();
  });

  await t.test('handleGetHistory returns 200 and messages', async () => {
    // Arrange
    const userId = 'history-test-user';
    const conv = await createConversation({ userId, title: 'History Test' });
    
    await createMessage({
      conversationId: conv.id,
      role: 'user',
      content: 'hello test',
      embedding: Array(1536).fill(0.1)
    });

    const req = ExpressMother.createMockReq({ user: { sub: userId } });
    const res = ExpressMother.createMockRes();
    const handler = handleGetHistory({});

    // Act
    await handler(req, res);

    // Assert
    assert.strictEqual(res.json.mock.calls.length, 1);
    const responseBody = res.json.mock.calls[0].arguments[0];
    assert.ok(responseBody.requestId);
    assert.strictEqual(responseBody.messages.length, 1);
    assert.strictEqual(responseBody.messages[0].content, 'hello test');
  });
});
