import express from 'express';
import { handleChat, handleGetHistory } from '../controllers/chat.controller.mjs';
import { createAuthMiddleware } from '../middlewares/auth.middleware.mjs';

export function createChatRouter(config) {
  const router = express.Router();
  router.get('/history', createAuthMiddleware(config), handleGetHistory(config));
  router.post('/', createAuthMiddleware(config), handleChat(config));
  return router;
}
