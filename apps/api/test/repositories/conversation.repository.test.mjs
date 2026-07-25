import test from 'node:test';
import assert from 'node:assert';
import { randomUUID } from 'crypto';
import {
  createConversation,
  findByUserId,
  findById,
  deleteById
} from '../../src/repositories/conversation.repository.mjs';

test('Conversation Repository', async (t) => {
  await t.test('createConversation creates and returns a conversation with a UUID', async () => {
    // Arrange
    const userId = randomUUID();
    const title = 'Test Conversation';

    // Act
    const conversation = await createConversation({ userId, title });

    // Assert
    assert.ok(conversation.id);
    assert.strictEqual(typeof conversation.id, 'string');
    assert.strictEqual(conversation.userId, userId);
    assert.strictEqual(conversation.title, title);
    assert.ok(conversation.createdAt);
  });

  await t.test('findByUserId returns conversations only for the given user', async () => {
    // Arrange
    const userId1 = randomUUID();
    const userId2 = randomUUID();
    await createConversation({ userId: userId1, title: 'Chat 1' });
    await createConversation({ userId: userId1, title: 'Chat 2' });
    await createConversation({ userId: userId2, title: 'Chat 3' });

    // Act
    const user1Conversations = await findByUserId(userId1);
    const user2Conversations = await findByUserId(userId2);

    // Assert
    assert.strictEqual(user1Conversations.length, 2);
    assert.strictEqual(user2Conversations.length, 1);
    assert.ok(user1Conversations.every(c => c.userId === userId1));
  });

  await t.test('findById returns the correct conversation', async () => {
    // Arrange
    const userId = randomUUID();
    const created = await createConversation({ userId, title: 'Find Me' });

    // Act
    const found = await findById(created.id);
    const notFound = await findById(randomUUID());

    // Assert
    assert.ok(found);
    assert.strictEqual(found.id, created.id);
    assert.strictEqual(notFound, null);
  });

  await t.test('deleteById deletes successfully only if both id and userId match (Tenant Isolation)', async () => {
    // Arrange
    const ownerId = randomUUID();
    const attackerId = randomUUID();
    const created = await createConversation({ userId: ownerId, title: 'Secret Chat' });

    // Act
    const maliciousDelete = await deleteById(created.id, attackerId); // Attacker tries to delete
    
    // Assert
    assert.strictEqual(maliciousDelete, false);
    const stillThere = await findById(created.id);
    assert.ok(stillThere, 'Conversation should not be deleted by attacker');

    // Act
    const ownerDelete = await deleteById(created.id, ownerId); // Owner deletes
    
    // Assert
    assert.strictEqual(ownerDelete, true);
    const gone = await findById(created.id);
    assert.strictEqual(gone, null, 'Conversation should be deleted by owner');
  });
});
