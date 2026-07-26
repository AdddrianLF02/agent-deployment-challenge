import * as messagesModule from "../messages.mjs";
import { retrieveRelevantContext, generateEmbedding } from "./rag.service.mjs";
import { runOrchestrator } from "../agents/orchestrator.agent.mjs";
import * as conversationRepository from "../repositories/conversation.repository.mjs";
import * as messageRepository from "../repositories/message.repository.mjs";

/**
 * Procesa la petición de chat, validando los mensajes y solicitando la completación.
 * 
 * @param {Object} params
 * @param {Object} params.model - Configuración del modelo.
 * @param {Array} params.messages - Mensajes a validar y enviar.
 * @param {string} params.userId - Identificador del usuario.
 * @returns {Promise<Object>} Resultado con { ok: true, content } o { ok: false, error }.
 */
export async function processChatCompletion({ model, messages, userId }) {
  const validation = messagesModule.validateMessages(messages);
  
  if (!validation.ok) {
    return validation;
  }

  const userInputMsg = validation.messages[validation.messages.length - 1];
  const userInput = userInputMsg.content;

  // 1. Aislamiento por usuario y verificación de sesión
  let conversations = await conversationRepository.findByUserId(userId);
  let conversationId;
  if (!conversations || conversations.length === 0) {
    const conv = await conversationRepository.createConversation({ userId, title: "Chat" });
    conversationId = conv.id;
  } else {
    conversationId = conversations[0].id;
  }

  // 2. Invocar RAG (recuperar contexto histórico)
  const historicalContext = await retrieveRelevantContext({ userId, queryText: userInput });

  // 3. Ejecutar el Orquestador
  const conversationMessages = validation.messages.slice(0, -1);
  const assistantResponse = await runOrchestrator({
    userInput,
    historicalContext,
    conversationMessages,
    config: { model }
  });

  // 4. Persistencia síncrona en PostgreSQL (guardar userMsg y assistantMsg con embeddings)
  // Nota: generamos embeddings para guardar
  const userEmbedding = await generateEmbedding(userInput);
  const assistantEmbedding = await generateEmbedding(assistantResponse.content);

  await messageRepository.createMessage({
    conversationId,
    role: userInputMsg.role,
    content: userInput,
    embedding: userEmbedding || [] // Prevenir fallo si generateEmbedding retorna null, messageRepository en JS mode puede manejar [], db.mjs esperaría el arreglo de 1536 si está conectada
  });

  await messageRepository.createMessage({
    conversationId,
    role: assistantResponse.role,
    content: assistantResponse.content,
    embedding: assistantEmbedding || []
  });

  return { ok: true, content: assistantResponse.content };
}

/**
 * Retrieves the chat history for a given user.
 * @param {Object} params
 * @param {string} params.userId
 * @returns {Promise<Object>} Object containing the list of messages.
 */
export async function getChatHistory({ userId }) {
  const messages = await messageRepository.findMessagesByUserId({ userId });
  return { ok: true, messages };
}
