import { extractTokenFromCookie, verifyToken } from "../services/auth.service.mjs";

export function createAuthMiddleware(config) {
  return function authMiddleware(req, res, next) {
    const token = extractTokenFromCookie(req.headers.cookie);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = verifyToken(token, config);
    if (!payload) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = payload;
    next();
  };
}
