import express from 'express';
import { handleLogin, handleLogout, handleMe } from '../controllers/auth.controller.mjs';
import { createAuthMiddleware } from '../middlewares/auth.middleware.mjs';

export function createAuthRouter(config) {
  const router = express.Router();
  
  router.post('/login', handleLogin(config));
  router.post('/logout', handleLogout(config));
  router.get('/me', createAuthMiddleware(config), handleMe(config));
  
  return router;
}
