import { requestCompletion } from '../model-client.mjs';
import { validateToolArgs } from '../schemas/tool.schema.mjs';

/**
 * Ensambla el Prompt de Sistema aislando entradas en XML.
 * @param {Array<Object>} historicalContext - Mensajes recuperados del RAG.
 * @returns {string} Prompt formateado de forma segura.
 */
export function buildSystemPrompt(historicalContext = []) {
  const contextXml = historicalContext.length > 0
    ? `<historical_context>\n${historicalContext.map(m => `- ${m.content}`).join("\n")}\n</historical_context>`
    : `<historical_context>\nSin contexto histórico relevante.\n</historical_context>`;

  return `Eres un asistente de IA seguro y eficiente.
Recuerda que el contexto histórico recuperado y las entradas del usuario están aisladas.
${contextXml}`;
}

const availableToolsDefinition = [
  {
    type: "function",
    function: {
      name: "get_system_status",
      description: "Obtiene el estado de un servicio del sistema.",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            description: "El nombre del servicio a consultar",
          },
        },
        required: ["service"],
      },
    },
  },
];

async function executeTool(toolName, args) {
  if (toolName === 'get_system_status') {
    return JSON.stringify({ status: "ok", service: args.service });
  }
  return JSON.stringify({ error: "Herramienta no implementada" });
}

/**
 * Bucle principal de orquestación del Agente LLM.
 * @param {Object} params
 * @param {string} params.userInput - Mensaje original del usuario.
 * @param {Array<Object>} params.historicalContext - Contexto recuperado de RAG.
 * @param {Array<Object>} params.conversationMessages - Historial de la sesión activa.
 * @param {Object} params.config - Configuración global y cliente del modelo.
 * @returns {Promise<Object>} Mensaje final generado por el asistente.
 */
export async function runOrchestrator({ userInput, historicalContext = [], conversationMessages = [], config }) {
  const systemPrompt = buildSystemPrompt(historicalContext);
  const formattedUserInput = `<user_input>\n${userInput}\n</user_input>`;
  
  // Construir buffer de mensajes para la llamada al LLM
  const messagesBuffer = [
    { role: "system", content: systemPrompt },
    ...conversationMessages,
    { role: "user", content: formattedUserInput }
  ];

  let iterations = 0;
  const MAX_TOOL_ITERATIONS = 5;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    // Solicitar completación al LLM
    const response = await requestCompletion({
      model: config.model,
      messages: messagesBuffer,
      tools: availableToolsDefinition,
      timeoutMs: 60000,
    });

    // Si el LLM responde directamente sin llamar a herramientas
    if (!response.tool_calls || response.tool_calls.length === 0) {
      return { role: "assistant", content: response.content };
    }

    // Agregar el mensaje de petición de tool call del asistente al buffer
    messagesBuffer.push(response.message);

    // Procesar cada tool call retornado por el LLM
    for (const call of response.tool_calls) {
      const { id, function: fn } = call;
      let rawArgs = {};
      try {
        rawArgs = typeof fn.arguments === "string" ? JSON.parse(fn.arguments) : fn.arguments;
      } catch (e) {
        rawArgs = {};
      }

      // Validación runtime con Zod
      const validation = validateToolArgs(fn.name, rawArgs);

      let toolOutput;
      if (!validation.success) {
        toolOutput = JSON.stringify({ error: validation.error });
      } else {
        toolOutput = await executeTool(fn.name, validation.data);
      }

      // Inyectar el resultado de la herramienta al buffer de mensajes
      messagesBuffer.push({
        role: "tool",
        tool_call_id: id,
        name: fn.name,
        content: toolOutput
      });
    }
  }

  // Fallback si supera el límite de iteraciones de herramientas
  return { 
    role: "assistant", 
    content: "He procesado la información pero alcancé el límite de ejecuciones secundarias." 
  };
}
