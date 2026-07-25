import assert from "node:assert/strict";
import test from "node:test";
import {
  validateCredentials,
  signToken,
  verifyToken,
  extractTokenFromCookie,
} from "../../src/services/auth.service.mjs";

const mockConfig = {
  auth: {
    adminUsername: "admin",
    adminPassword: "password",
    jwtSecret: "secret",
    tokenMaxAgeSeconds: 3600,
  },
};

test("validateCredentials correctly verifies user", () => {
  assert.equal(validateCredentials("admin", "password", mockConfig), true);
  assert.equal(validateCredentials("admin", "wrong", mockConfig), false);
  assert.equal(validateCredentials("wrong", "password", mockConfig), false);
});

test("signToken and verifyToken work correctly together", () => {
  const token = signToken({ sub: "admin" }, mockConfig);
  assert.ok(token);

  const payload = verifyToken(token, mockConfig);
  assert.equal(payload.sub, "admin");
});

test("verifyToken returns null for invalid token", () => {
  const payload = verifyToken("invalid-token", mockConfig);
  assert.equal(payload, null);
});

test("extractTokenFromCookie correctly parses cookie", () => {
  const token = extractTokenFromCookie("auth_token=my_token; Other=value");
  assert.equal(token, "my_token");

  assert.equal(extractTokenFromCookie(""), null);
  assert.equal(extractTokenFromCookie(null), null);
  assert.equal(extractTokenFromCookie("Other=value"), null);
});
