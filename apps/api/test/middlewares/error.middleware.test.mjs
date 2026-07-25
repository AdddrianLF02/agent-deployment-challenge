import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { errorHandlerMiddleware } from "../../src/middlewares/error.middleware.mjs";
import { ExpressMother } from "../factories/express.mothers.mjs";

describe("errorHandlerMiddleware", () => {
  it("should return 413 if error status is 413", () => {
    // Arrange
    const req = ExpressMother.createMockReq();
    const res = ExpressMother.createMockRes();
    const next = ExpressMother.createMockNext();
    const error = { status: 413 };

    // Act
    errorHandlerMiddleware(error, req, res, next);

    // Assert
    assert.strictEqual(res.status.mock.calls.length, 1);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 413);
    assert.strictEqual(res.json.mock.calls.length, 1);
    assert.deepEqual(res.json.mock.calls[0].arguments[0], { error: "Request body is too large" });
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it("should return 400 if error is SyntaxError with status 400", () => {
    // Arrange
    const req = ExpressMother.createMockReq();
    const res = ExpressMother.createMockRes();
    const next = ExpressMother.createMockNext();
    const error = new SyntaxError("Unexpected token");
    error.status = 400;

    // Act
    errorHandlerMiddleware(error, req, res, next);

    // Assert
    assert.strictEqual(res.status.mock.calls.length, 1);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    assert.strictEqual(res.json.mock.calls.length, 1);
    assert.deepEqual(res.json.mock.calls[0].arguments[0], { error: "Request body contains invalid JSON" });
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it("should return 500 for unexpected errors", () => {
    // Arrange
    const req = ExpressMother.createMockReq();
    const res = ExpressMother.createMockRes();
    const next = ExpressMother.createMockNext();
    const error = new Error("Some unexpected error");

    // Act
    errorHandlerMiddleware(error, req, res, next);

    // Assert
    assert.strictEqual(res.status.mock.calls.length, 1);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    assert.strictEqual(res.json.mock.calls.length, 1);
    assert.deepEqual(res.json.mock.calls[0].arguments[0], { error: "An unexpected error occurred" });
    assert.strictEqual(next.mock.calls.length, 0);
  });
});
