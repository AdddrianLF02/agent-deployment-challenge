import { test } from "node:test";
import assert from "node:assert/strict";
import { getHealth } from "../../src/controllers/health.controller.mjs";
import { ExpressMother } from "../factories/express.mothers.mjs";

test("health.controller - getHealth", async (t) => {
  await t.test("should return 200 and ok status with model configured", () => {
    // Arrange
    const config = { modelConfigured: true, model: { name: "test-model" } };
    const req = ExpressMother.createMockReq();
    const res = ExpressMother.createMockRes();
    const handler = getHealth(config);

    // Act
    handler(req, res);

    // Assert
    assert.strictEqual(res.status.mock.calls.length, 1);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
    assert.strictEqual(res.json.mock.calls.length, 1);
    assert.deepEqual(res.json.mock.calls[0].arguments[0], {
      status: "ok",
      model: { configured: true, name: "test-model" },
    });
  });

  await t.test("should return 200 and ok status with model not configured", () => {
    // Arrange
    const config = { modelConfigured: false };
    const req = ExpressMother.createMockReq();
    const res = ExpressMother.createMockRes();
    const handler = getHealth(config);

    // Act
    handler(req, res);

    // Assert
    assert.strictEqual(res.status.mock.calls.length, 1);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
    assert.strictEqual(res.json.mock.calls.length, 1);
    assert.deepEqual(res.json.mock.calls[0].arguments[0], {
      status: "ok",
      model: { configured: false, name: null },
    });
  });
});
