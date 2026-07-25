import express from 'express';
import { getHealth } from '../controllers/health.controller.mjs';

export function createHealthRouter(config) {
  const router = express.Router();
  router.get('/', getHealth(config));
  return router;
}
