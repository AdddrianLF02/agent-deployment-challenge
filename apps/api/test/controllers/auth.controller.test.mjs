import assert from "node:assert/strict";
import test from "node:test";
import { handleLogin, handleLogout, handleMe } from "../../src/controllers/auth.controller.mjs";
import { ExpressMother } from "../factories/express.mothers.mjs";
import { signToken } from "../../src/services/auth.service.mjs";

const mockConfig = {
  auth: { adminUsername: "admin", adminPassword: "password", jwtSecret: "secret", tokenMaxAgeSeconds: 3600 }
};

test("handleLogin success sets cookie and returns 200", () => {
  const req = ExpressMother.createMockReq({ body: { username: "admin", password: "password" } });
  const res = ExpressMother.createMockRes();
  
  handleLogin(mockConfig)(req, res);

  assert.equal(res.setHeader.mock.calls[0].arguments[0], "Set-Cookie");
  assert.ok(res.setHeader.mock.calls[0].arguments[1].includes("auth_token="));
  assert.equal(res.status.mock.calls[0].arguments[0], 200);
});

test("handleLogin failure returns 401", () => {
  const req = ExpressMother.createMockReq({ body: { username: "admin", password: "wrong" } });
  const res = ExpressMother.createMockRes();
  
  handleLogin(mockConfig)(req, res);

  assert.equal(res.status.mock.calls[0].arguments[0], 401);
  assert.equal(res.setHeader.mock.calls.length, 0);
});

test("handleLogout clears cookie and returns 200", () => {
  const req = ExpressMother.createMockReq();
  const res = ExpressMother.createMockRes();
  
  handleLogout(mockConfig)(req, res);

  assert.equal(res.setHeader.mock.calls[0].arguments[0], "Set-Cookie");
  assert.ok(res.setHeader.mock.calls[0].arguments[1].includes("Max-Age=0"));
  assert.equal(res.status.mock.calls[0].arguments[0], 200);
});

test("handleMe returns 200 and user if req.user exists", () => {
  const req = ExpressMother.createMockReq({ user: { sub: "admin" } });
  const res = ExpressMother.createMockRes();
  
  handleMe(mockConfig)(req, res);

  assert.equal(res.status.mock.calls[0].arguments[0], 200);
  assert.equal(res.json.mock.calls[0].arguments[0].user.sub, "admin");
});

test("handleMe returns 401 if req.user is absent", () => {
  const req = ExpressMother.createMockReq();
  const res = ExpressMother.createMockRes();
  
  handleMe(mockConfig)(req, res);

  assert.equal(res.status.mock.calls[0].arguments[0], 401);
});
