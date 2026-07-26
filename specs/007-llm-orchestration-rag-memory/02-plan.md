# Spec 007 - Fase 2: Diseño Técnico (`02-plan.md`)

## 1. Visión General de la Arquitectura

El propósito de la **Spec 007** es dotar a la plataforma de un motor de agente capaz de mantener conversaciones inteligentes con memoria semántica cruzada (RAG) entre sesiones, protección contra ataques de Prompt Injection mediante aislamiento en etiquetas XML, y capacidad de ejecución de herramientas externas validadas con esquemas Zod en tiempo de ejecución.

---

## 2. Restricciones y Guardarraíles Inquebrantables (Nivel NEVER)

1. **Parámetros y Aislamiento RAG**:
   - **Modelo de Incrustación Vectorial**: Obligatoriamente `text-embedding-3-small` (vector de 1536 dimensiones).
   - **Búsqueda Semántica**: `Top K = 5` mensajes máximos recuperados, con umbral de similitud por coseno `minSimilarity >= 0.60`.
   - **Aislamiento Multi-inquilino (Tenant Isolation)**: La consulta SQL/Vectorial DEBE contener la cláusula explícita `WHERE user_id = active_user_id`. Prohibido realizar búsquedas globales.

2. **Seguridad y Aislamiento de Prompts**:
   - Las entradas del usuario y el contexto histórico NUNCA se inyectarán en texto plano directo en el prompt de sistema.
   - Deben envolverse estrictamente en las etiquetas XML: `<user_input>` y `<historical_context>`.

3. **Límites de Operación y Timeouts**:
   - **Límite de mensajes por sesión**: Máximo 30 mensajes (`MAX_MESSAGES = 30`).
   - **Timeout de petición LLM**: 60,000 ms (`MODEL_REQUEST_TIMEOUT_MS = 60000`).
   - **Límite de bucle de herramientas**: Máximo 5 iteraciones consecutivas de Tool Calling para evitar bucles infinitos.

---

## 3. Especificación de Componentes y Firmas de Código

### A. Capa de Servicios RAG (`apps/api/src/services/rag.service.mjs`)

El servicio RAG gestiona la generación de vectores de incrustación y la búsqueda de contexto semántico previo.

```javascript
/**
 * Genera el vector embedding de un texto usando OpenAI API.
 * @param {string} text - Texto del mensaje a incrustar.
 * @returns {Promise<Array<number>|null>} Vector de 1536 dimensiones o null en fallback.
 */
export async function generateEmbedding(text) { ... }

/**
 * Recupera mensajes históricamente relevantes del usuario activo.
 * @param {Object} params
 * @param {string} params.userId - Identificador único del usuario autenticado.
 * @param {string} params.queryText - Mensaje actual del usuario.
 * @param {number} [params.limit=5] - Cantidad máxima de resultados.
 * @param {number} [params.minSimilarity=0.60] - Umbral de corte por similitud de coseno.
 * @returns {Promise<Array<Object>>} Lista de fragmentos históricos relevantes.
 */
export async function retrieveRelevantContext({ userId, queryText, limit = 5, minSimilarity = 0.60 }) { ... }
```

**Manejo de Fallback y Resiliencia**:
Si la API de OpenAI o PostgreSQL fallan, `retrieveRelevantContext` captura la excepción, registra el log de advertencia con `[requestId]` y retorna un arreglo vacío `[]`. Esto permite que la conversación continúe apoyándose únicamente en la memoria a corto plazo de la sesión actual.

---

### B. Validación de Herramientas y Esquemas Zod (`apps/api/src/schemas/tool.schema.mjs`)

Centraliza la definición de esquemas Zod y la función de validación runtime para los argumentos devueltos por el LLM en Tool Calls.

```javascript
import { z } from "zod";

// Ejemplo: Esquema para herramienta de consulta de estado/información
export const toolSchemas = {
  get_system_status: z.object({
    service: z.string().min(1, "El nombre del servicio es requerido"),
  }),
};

/**
 * Valida en tiempo de ejecución los argumentos de una herramienta.
 * @param {string} toolName - Nombre de la herramienta solicitada.
 * @param {Object} rawArgs - Argumentos entregados por el LLM (JSON parsed).
 * @returns {{ success: boolean, data?: Object, error?: string }}
 */
export function validateToolArgs(toolName, rawArgs) {
  const schema = toolSchemas[toolName];
  if (!schema) {
    return { success: false, error: `Herramienta desconocida: ${toolName}` };
  }
  const result = schema.safeParse(rawArgs);
  if (!result.success) {
    return { 
      success: false, 
      error: `Error de validación de argumentos en '${toolName}': ${result.error.issues.map(i => i.message).join(", ")}` 
    };
  }
  return { success: true, data: result.data };
}
```

---

### C. Motor del Agente Orquestador (`apps/api/src/agents/orchestrator.agent.mjs`)

El orquestador implementa el bucle de razonamiento y ejecución de herramientas basado en el Diagrama 2.

```javascript
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

/**
 * Bucle principal de orquestación del Agente LLM.
 * @param {Object} params
 * @param {string} params.userInput - Mensaje original del usuario.
 * @param {Array<Object>} params.historicalContext - Contexto recuperado de RAG.
 * @param {Array<Object>} params.conversationMessages - Historial de la sesión activa.
 * @param {Object} params.config - Configuración global y cliente del modelo.
 * @returns {Promise<Object>} Mensaje final generado por el asistente.
 */
export async function runOrchestrator({ userInput, historicalContext, conversationMessages, config }) {
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

    // Solicitar completación al LLM con timeout de 60000ms y definición de tools
    const response = await requestModelCompletion({
      config,
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
```

---

### D. Integración en la Capa de Negocio (`apps/api/src/services/chat.service.mjs`)

Orquesta el flujo completo de la petición `POST /api/chat`:

1. **Aislamiento por usuario y verificación de sesión**.
2. **Control de límite de mensajes por sesión** (`MAX_MESSAGES = 30`).
3. **Invocación de `rag.service.mjs`** (`Top K = 5`, `minSimilarity = 0.60`, `user_id = active_user_id`).
4. **Ejecución del `orchestrator.agent.mjs`**.
5. **Persistencia síncrona en PostgreSQL** (`messages.repository.mjs`) guardando los mensajes de usuario y asistente junto con sus vectores embeddings generados.

---

## 4. Matriz de Componentes e Impacto en el Repositorio

| Componente | Ruta de Archivo | Responsabilidad |
| :--- | :--- | :--- |
| **RAG Service** | `apps/api/src/services/rag.service.mjs` | Generar embeddings y consulta vectorial pgvector por `user_id`. |
| **Tool Schemas** | `apps/api/src/schemas/tool.schema.mjs` | Validación Zod runtime para llamadas a herramientas del LLM. |
| **Agent Orchestrator**| `apps/api/src/agents/orchestrator.agent.mjs` | Bucle while de Tool Calling, aislamiento prompt XML. |
| **Chat Service** | `apps/api/src/services/chat.service.mjs` | Orquestar flujo completo HTTP, RAG, Agente y Persistencia DB. |
| **Message Repo** | `apps/api/src/repositories/message.repository.mjs` | Consultas SQL con operador de distancia coseno y filtro de tenant. |

---

## 5. Estrategia de Verificación y Cobertura de Pruebas

1. **Test Unitario de Validación Zod (`tool.schema.test.mjs`)**:
   - Verificar que argumentos válidos son aceptados.
   - Verificar que argumentos malformados retornan `success: false` y mensaje de error descriptivo sin arrojar excepciones.
2. **Test Unitario del Aislamiento XML (`orchestrator.agent.test.mjs`)**:
   - Verificar que las etiquetas `<user_input>` y `<historical_context>` están presentes en el prompt de sistema.
3. **Test Unitario de Búsqueda Vectorial (`rag.service.test.mjs`)**:
   - Verificar que la búsqueda vectorial incluye `WHERE user_id = ?`, `limit = 5` y `minSimilarity >= 0.60`.
4. **Test Integración In-Memory (`chat.service.test.mjs`)**:
   - Confirmar que si el servicio de embeddings falla, el chat continúa funcionando en modo degradado.
