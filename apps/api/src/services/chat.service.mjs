import * as messagesModule from "../messages.mjs";
import * as modelClientModule from "../model-client.mjs";

/**
 * Procesa la petición de chat, validando los mensajes y solicitando la completación.
 * 
 * @param {Object} params
 * @param {Object} params.model - Configuración del modelo.
 * @param {Array} params.messages - Mensajes a validar y enviar.
 * @returns {Promise<Object>} Resultado con { ok: true, content } o { ok: false, error }.
 */
export async function processChatCompletion({ model, messages }) {
  const validation = messagesModule.validateMessages(messages);
  
  if (!validation.ok) {
    return validation;
  }

  const { content } = await modelClientModule.requestCompletion({
    model,
    messages: validation.messages,
  });

  return { ok: true, content };
}
