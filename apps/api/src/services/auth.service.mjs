import jwt from "jsonwebtoken";
import cookie from "cookie";

export function validateCredentials(username, password, config) {
  return username === config.auth.adminUsername && password === config.auth.adminPassword;
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
