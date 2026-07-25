import express from 'express';
import { handleChat } from '../controllers/chat.controller.mjs';
import { createAuthMiddleware } from '../middlewares/auth.middleware.mjs';

export function createChatRouter(config) {
  const router = express.Router();
  router.post('/', createAuthMiddleware(config), handleChat(config));
  return router;
}
