import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { createApp } from "../../src/server.mjs";
import cookie from "cookie";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address()));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("authentication and chat protection integration flow", async () => {
  const config = {
    auth: { adminUsername: "admin", adminPassword: "password", jwtSecret: "secret", tokenMaxAgeSeconds: 3600 },
    modelConfigured: true,
    model: {
      apiKey: "",
      baseUrl: `http://127.0.0.1:0/v1`,
      name: "local-test-model",
      systemPrompt: "Be useful",
      timeoutMs: 1_000,
    },
  };
  
  const app = createApp(config);
  const appServer = http.createServer(app);
  const appAddress = await listen(appServer);

  try {
    // 1. Petición a POST /api/chat sin autenticación -> HTTP 401
    let response = await fetch(`http://127.0.0.1:${appAddress.port}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
    });
    assert.equal(response.status, 401);

    // 2. Petición a POST /api/auth/login con credenciales válidas -> HTTP 200 + Set-Cookie
    response = await fetch(`http://127.0.0.1:${appAddress.port}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password" }),
    });
    assert.equal(response.status, 200);
    const setCookieHeader = response.headers.get("set-cookie");
    assert.ok(setCookieHeader);
    
    const parsedCookie = cookie.parse(setCookieHeader);
    const authToken = parsedCookie.auth_token;
    assert.ok(authToken);

    // 3. Petición a POST /api/chat enviando la cookie -> pasa la auth
    response = await fetch(`http://127.0.0.1:${appAddress.port}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", "cookie": `auth_token=${authToken}` },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
    });
    assert.notEqual(response.status, 401);

    // 4. Petición a POST /api/auth/logout -> elimina la cookie
    response = await fetch(`http://127.0.0.1:${appAddress.port}/api/auth/logout`, {
      method: "POST"
    });
    assert.equal(response.status, 200);
    const logoutCookie = response.headers.get("set-cookie");
    assert.ok(logoutCookie.includes("Max-Age=0"));
  } finally {
    await close(appServer);
  }
});
