import crypto from "node:crypto";
import * as chatServiceModule from "../services/chat.service.mjs";
import { ModelRequestError } from "../model-client.mjs";

/**
 * Controlador de la ruta chat.
 * 
 * @param {Object} config - Configuración de la aplicación.
 * @returns {Function} Express route handler.
 */
export function handleChat(config) {
  return async (request, response) => {
    const requestId = crypto.randomUUID();

    if (!config.modelConfigured) {
      return response.status(503).json({
        error: "The model is not configured",
        requestId,
      });
    }

    try {
      const result = await chatServiceModule.processChatCompletion({
        model: config.model,
        messages: request.body?.messages,
        userId: request.user?.sub,
      });

      if (!result.ok) {
        return response.status(400).json({ error: result.error, requestId });
      }

      return response.json({ message: { role: "assistant", content: result.content }, requestId });
    } catch (error) {
      const status = error instanceof ModelRequestError ? error.status : 500;
      const publicMessage =
        error instanceof ModelRequestError
          ? error.message
          : "An unexpected error occurred";

      console.error(`[${requestId}] chat request failed: ${error?.message ?? "unknown error"}`);
      return response.status(status).json({ error: publicMessage, requestId });
    }
  };
}
