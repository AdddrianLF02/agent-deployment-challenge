import test from 'node:test';
import assert from 'node:assert/strict';
import { createUser, findByUsername, findById, _clearUsersStore } from '../../src/repositories/user.repository.mjs';

test('User Repository - In-Memory Fallback', async (t) => {
  // Arrange
  _clearUsersStore();

  await t.test('createUser should create a user and return it with UUID', async () => {
    // Arrange
    const userData = { username: 'testuser', passwordHash: 'hash123' };

    // Act
    const user = await createUser(userData);

    // Assert
    assert.ok(user.id);
    assert.strictEqual(typeof user.id, 'string');
    assert.match(user.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    assert.strictEqual(user.username, 'testuser');
    assert.strictEqual(user.password_hash, 'hash123');
    assert.ok(user.created_at instanceof Date);
  });

  await t.test('findByUsername should find an existing user', async () => {
    // Arrange
    _clearUsersStore();
    await createUser({ username: 'johndoe', passwordHash: 'secret' });

    // Act
    const foundUser = await findByUsername('johndoe');

    // Assert
    assert.ok(foundUser);
    assert.strictEqual(foundUser.username, 'johndoe');
  });

  await t.test('findByUsername should return null for non-existing user', async () => {
    // Arrange
    _clearUsersStore();

    // Act
    const notFound = await findByUsername('nobody');

    // Assert
    assert.strictEqual(notFound, null);
  });

  await t.test('findById should find an existing user', async () => {
    // Arrange
    _clearUsersStore();
    const createdUser = await createUser({ username: 'janedoe', passwordHash: 'secret2' });

    // Act
    const foundUser = await findById(createdUser.id);

    // Assert
    assert.ok(foundUser);
    assert.strictEqual(foundUser.id, createdUser.id);
    assert.strictEqual(foundUser.username, 'janedoe');
  });

  await t.test('findById should return null for non-existing user', async () => {
    // Arrange
    _clearUsersStore();

    // Act
    const notFound = await findById('00000000-0000-0000-0000-000000000000');

    // Assert
    assert.strictEqual(notFound, null);
  });

  await t.test('createUser should throw when username already exists', async () => {
    // Arrange
    _clearUsersStore();
    await createUser({ username: 'uniqueuser', passwordHash: '123' });

    // Act & Assert
    await assert.rejects(
      async () => {
        await createUser({ username: 'uniqueuser', passwordHash: '456' });
      },
      /already exists/
    );
  });
});
