import jwt from "jsonwebtoken";
import cookie from "cookie";
import crypto from "node:crypto";
import { findByUsername, createUser } from "../repositories/user.repository.mjs";

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function validateCredentials(username, password, config) {
  const user = await findByUsername(username);

  if (user) {
    if (user.password_hash === hashPassword(password)) {
      return user;
    }
    return false;
  }

  if (username === config.auth.adminUsername && password === config.auth.adminPassword) {
    const newUser = await createUser({
      username,
      passwordHash: hashPassword(password)
    });
    return newUser;
  }

  return false;
}

export function signToken(payload, config) {
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.tokenMaxAgeSeconds,
  });
}

export function verifyToken(token, config) {
  try {
    return jwt.verify(token, config.auth.jwtSecret);
  } catch {
    return null;
  }
}

export function extractTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const parsed = cookie.parse(cookieHeader);
  return parsed.auth_token || null;
}
