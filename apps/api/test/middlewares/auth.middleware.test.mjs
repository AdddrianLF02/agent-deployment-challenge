import assert from "node:assert/strict";
import test from "node:test";
import { createAuthMiddleware } from "../../src/middlewares/auth.middleware.mjs";
import { ExpressMother } from "../factories/express.mothers.mjs";
import { signToken } from "../../src/services/auth.service.mjs";

const mockConfig = {
  auth: { adminUsername: "admin", adminPassword: "password", jwtSecret: "secret", tokenMaxAgeSeconds: 3600 }
};

test("authMiddleware returns 401 if no cookie", () => {
  const middleware = createAuthMiddleware(mockConfig);
  const req = ExpressMother.createMockReq();
  const res = ExpressMother.createMockRes();
  const next = ExpressMother.createMockNext();

  middleware(req, res, next);

  assert.equal(res.status.mock.calls[0].arguments[0], 401);
  assert.equal(res.json.mock.calls[0].arguments[0].error, "Unauthorized");
  assert.equal(next.mock.calls.length, 0);
});

test("authMiddleware returns 401 for invalid token", () => {
  const middleware = createAuthMiddleware(mockConfig);
  const req = ExpressMother.createMockReq({ headers: { cookie: "auth_token=invalid_token" } });
  const res = ExpressMother.createMockRes();
  const next = ExpressMother.createMockNext();

  middleware(req, res, next);

  assert.equal(res.status.mock.calls[0].arguments[0], 401);
  assert.equal(next.mock.calls.length, 0);
});

test("authMiddleware calls next and injects user for valid token", () => {
  const token = signToken({ sub: "admin" }, mockConfig);
  const middleware = createAuthMiddleware(mockConfig);
  const req = ExpressMother.createMockReq({ headers: { cookie: `auth_token=${token}` } });
  const res = ExpressMother.createMockRes();
  const next = ExpressMother.createMockNext();

  middleware(req, res, next);

  assert.equal(next.mock.calls.length, 1);
  assert.equal(req.user.sub, "admin");
});
