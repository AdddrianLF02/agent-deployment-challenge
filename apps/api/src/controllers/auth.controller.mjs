import { validateCredentials, signToken } from "../services/auth.service.mjs";
import cookie from "cookie";

export function handleLogin(config) {
  return function (req, res) {
    const { username, password } = req.body || {};
    
    if (!validateCredentials(username, password, config)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ sub: username }, config);
    const serializedCookie = cookie.serialize("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: config.auth.tokenMaxAgeSeconds
    });

    res.setHeader("Set-Cookie", serializedCookie);
    res.status(200).json({ success: true });
  };
}

export function handleLogout(config) {
  return function (req, res) {
    const serializedCookie = cookie.serialize("auth_token", "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0
    });

    res.setHeader("Set-Cookie", serializedCookie);
    res.status(200).json({ success: true });
  };
}

export function handleMe(config) {
  return function (req, res) {
    if (req.user) {
      res.status(200).json({ user: req.user });
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };
}
