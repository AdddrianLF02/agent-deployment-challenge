import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { handleChat } from "../../src/controllers/chat.controller.mjs";
import { ExpressMother } from "../factories/express.mothers.mjs";

test("chat.controller - handleChat", async (t) => {
  const originalFetch = global.fetch;

  t.afterEach(() => {
    global.fetch = originalFetch;
  });

  const config = { 
    modelConfigured: true, 
    model: { name: "test", baseUrl: "http://api", systemPrompt: "sys", timeoutMs: 1000 } 
  };
  const controller = handleChat(config);

  await t.test("should return 503 if model is not configured", async () => {
    // Arrange
    const unconfiguredConfig = { modelConfigured: false };
    const unconfiguredController = handleChat(unconfiguredConfig);
    const req = ExpressMother.createMockReq();
    const res = ExpressMother.createMockRes();

    // Act
    await unconfiguredController(req, res);

    // Assert
    assert.strictEqual(res.status.mock.calls.length, 1);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 503);
    assert.strictEqual(res.json.mock.calls.length, 1);
    assert.strictEqual(res.json.mock.calls[0].arguments[0].error, "The model is not configured");
  });

  await t.test("should return 400 if messages validation fails", async () => {
    // Arrange
    const req = ExpressMother.createMockReq({ body: { messages: [] } }); // invalid
    const res = ExpressMother.createMockRes();

    // Act
    await controller(req, res);

    // Assert
    assert.strictEqual(res.status.mock.calls.length, 1);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    assert.strictEqual(res.json.mock.calls.length, 1);
    assert.match(res.json.mock.calls[0].arguments[0].error, /A non-empty messages array is required/);
  });

  await t.test("should return 200 and assistant content on success", async () => {
    // Arrange
    const mockResponse = {
      ok: true,
      json: async () => ({ choices: [{ message: { content: "response text" } }] })
    };
    global.fetch = mock.fn(async () => mockResponse);

    const req = ExpressMother.createMockReq({ body: { messages: [{ role: "user", content: "hello" }] } });
    const res = ExpressMother.createMockRes();

    // Act
    await controller(req, res);

    // Assert
    assert.strictEqual(res.json.mock.calls.length, 1);
    assert.deepEqual(res.json.mock.calls[0].arguments[0].message, { role: "assistant", content: "response text" });
  });

  await t.test("should return 504 on ModelRequestError timeout", async () => {
    // Arrange
    const originalConsoleError = console.error;
    console.error = () => {};
    
    global.fetch = mock.fn(async () => {
      const err = new Error("Timeout");
      err.name = "TimeoutError";
      throw err;
    });

    const req = ExpressMother.createMockReq({ body: { messages: [{ role: "user", content: "hello" }] } });
    const res = ExpressMother.createMockRes();

    // Act
    await controller(req, res);

    // Assert
    assert.strictEqual(res.status.mock.calls.length, 1);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 504);
    assert.strictEqual(res.json.mock.calls.length, 1);
    assert.strictEqual(res.json.mock.calls[0].arguments[0].error, "The model request timed out");
    
    console.error = originalConsoleError;
  });

  await t.test("should return 500 on unexpected errors", async () => {
    // Arrange
    const originalConsoleError = console.error;
    console.error = () => {};
    
    // Si pasamos model: null, lanzará TypeError al acceder a model.name dentro del servicio,
    // que se convertirá en un catch en chat.controller.
    const crashConfig = { modelConfigured: true, model: null };
    const crashController = handleChat(crashConfig);
    
    const req = ExpressMother.createMockReq({ body: { messages: [{ role: "user", content: "hello" }] } });
    const res = ExpressMother.createMockRes();

    // Act
    await crashController(req, res);

    // Assert
    assert.strictEqual(res.status.mock.calls.length, 1);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    assert.strictEqual(res.json.mock.calls.length, 1);
    assert.strictEqual(res.json.mock.calls[0].arguments[0].error, "An unexpected error occurred");
    
    console.error = originalConsoleError;
  });
});
