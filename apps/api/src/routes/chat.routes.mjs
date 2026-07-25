import express from 'express';
import { handleChat } from '../controllers/chat.controller.mjs';

export function createChatRouter(config) {
  const router = express.Router();
  router.post('/', handleChat(config));
  return router;
}
