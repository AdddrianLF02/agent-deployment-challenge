import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { securityMiddleware } from "../../src/middlewares/security.middleware.mjs";
import { ExpressMother } from "../factories/express.mothers.mjs";

describe("securityMiddleware", () => {
  it("should set security headers and call next", () => {
    // Arrange
    const req = ExpressMother.createMockReq();
    const res = ExpressMother.createMockRes();
    const next = ExpressMother.createMockNext();

    // Act
    securityMiddleware(req, res, next);

    // Assert
    assert.strictEqual(res.set.mock.calls.length, 1);
    assert.deepEqual(res.set.mock.calls[0].arguments[0], {
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
    });
    assert.strictEqual(next.mock.calls.length, 1);
  });
});
