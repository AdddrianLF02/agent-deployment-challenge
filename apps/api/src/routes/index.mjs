import express from 'express';
import { createHealthRouter } from './health.routes.mjs';
import { createChatRouter } from './chat.routes.mjs';

export function createApiRouter(config) {
  const router = express.Router();
  
  router.use('/health', createHealthRouter(config));
  router.use('/chat', createChatRouter(config));
  
  return router;
}
