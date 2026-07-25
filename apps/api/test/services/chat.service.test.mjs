import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { processChatCompletion } from "../../src/services/chat.service.mjs";

test("chat.service - processChatCompletion", async (t) => {
  const originalFetch = global.fetch;

  t.afterEach(() => {
    global.fetch = originalFetch;
  });

  await t.test("should return error if validation fails (empty messages)", async () => {
    // Arrange
    const params = { model: {}, messages: [] }; // invalid because no user message

    // Act
    const result = await processChatCompletion(params);

    // Assert
    assert.strictEqual(result.ok, false);
    assert.match(result.error, /A non-empty messages array is required/);
  });

  await t.test("should return success and content if validation passes and request succeeds", async () => {
    // Arrange
    const mockResponse = {
      ok: true,
      json: async () => ({ choices: [{ message: { content: "mocked response" } }] })
    };
    global.fetch = mock.fn(async () => mockResponse);

    const params = { 
      model: { name: "test-model", baseUrl: "http://api", systemPrompt: "sys", timeoutMs: 1000 }, 
      messages: [{ role: "user", content: "hello" }] 
    };

    // Act
    const result = await processChatCompletion(params);

    // Assert
    assert.deepEqual(result, { ok: true, content: "mocked response" });
    assert.strictEqual(global.fetch.mock.calls.length, 1);
  });
});
