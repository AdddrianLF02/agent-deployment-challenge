# Spec 007 - Fase 3: Desglose de Tareas Atómicas (`03-tasks.md`)

## Plan de Ejecución por Oleadas Secuenciales (Waves)

---

### Oleada 1: Memoria Semántica RAG

#### Tarea 1.1: Implementación de la Búsqueda Vectorial por Inquilino en Repositorio
- **Rol**: Senior Backend Engineer
- **Tarea**: Extender `apps/api/src/repositories/message.repository.mjs` para implementar la función de búsqueda por similitud de coseno (`findSimilarMessages({ userId, embedding, limit, minSimilarity })`). Utilizar el operador de distancia por coseno de pgvector (`1 - (embedding <=> $1)`) realizando la consulta sobre la tabla `messages` e inyectando explícitamente el filtro por `user_id`.
- **Restricciones**:
  - Filtro obligatorio e inquebrantable `WHERE user_id = active_user_id` (Tenant Isolation).
  - Filtro de similitud `minSimilarity >= 0.60` y límite predeterminado `limit = 5` (Top K = 5).
  - Resiliencia: Si `NODE_ENV === "test"` o si la base de datos no está disponible, utilizar un fallback in-memory seguro.
- **Éxito**: Test unitario/integración en `apps/api/test/repositories/message.repository.test.mjs` donde mensajes de otro `user_id` nunca se retornan y solo se devuelven coincidencias con similitud >= 0.60.

#### Tarea 1.2: Servicio RAG y Fallback Defensivo de Incrustaciones Vectoriales
- **Rol**: AI / Backend Engineer
- **Tarea**: Crear `apps/api/src/services/rag.service.mjs` exponiendo `generateEmbedding(text)` (usando el modelo `text-embedding-3-small` de OpenAI) y `retrieveRelevantContext({ userId, queryText, limit, minSimilarity })`. Integrar llamadas a `message.repository.mjs`.
- **Restricciones**:
  - Modelo de embeddings obligado: `text-embedding-3-small` (1536 dimensiones).
  - Umbral coseno `>= 0.60` y `Top K = 5`.
  - Defensa contra fallos: Si la API de OpenAI o la base de datos no responden, registrar el error y devolver un arreglo vacío `[]` sin lanzar excepciones no controladas.
- **Éxito**: Test unitario en `apps/api/test/services/rag.service.test.mjs` que verifique la recuperación exitosa de contexto y el fallback en caso de error simulado de red o DB.

---

### Oleada 2: Validación de Herramientas (Tool Calling)

#### Tarea 2.1: Definición de Esquemas Zod y Validación Runtime de Herramientas
- **Rol**: Senior Backend Developer
- **Tarea**: Crear `apps/api/src/schemas/tool.schema.mjs` exportando los esquemas Zod de las herramientas disponibles del sistema y la función de validación runtime `validateToolArgs(toolName, rawArgs)`.
- **Restricciones**:
  - Toda herramienta ejecutable DEBE contar con un esquema Zod correspondiente.
  - La validación debe usar `.safeParse()` y retornar un objeto estructurado `{ success, data, error }`. NUNCA arrojar excepciones no capturadas al validar JSON entregado por el LLM.
- **Éxito**: Test unitario en `apps/api/test/schemas/tool.schema.test.mjs` que verifique que argumentos válidos son parseados con éxito y que payload malformado retorna `success: false` con mensaje descriptivo.

---

### Oleada 3: Motor Orquestador LLM

#### Tarea 3.1: Construcción de Prompts con Aislamiento XML contra Prompt Injections
- **Rol**: AI Engineer
- **Tarea**: Crear `apps/api/src/agents/orchestrator.agent.mjs` e implementar la función `buildSystemPrompt(historicalContext)`. Ensamblar las entradas envolviendo el contexto histórico en `<historical_context>` y el input del usuario en `<user_input>`.
- **Restricciones**:
  - PROHIBIDO insertar texto directo del usuario o contexto en el prompt de sistema sin envoltorio XML.
  - Formato estricto de etiquetas: `<user_input>` e `<historical_context>`.
- **Éxito**: Test unitario en `apps/api/test/agents/orchestrator.agent.test.mjs` verificando que el string retornado por `buildSystemPrompt()` contiene las etiquetas XML requeridas.

#### Tarea 3.2: Bucle de Razonamiento y Ejecución de Herramientas (Tool Calling Loop)
- **Rol**: AI / Backend Engineer
- **Tarea**: Implementar en `apps/api/src/agents/orchestrator.agent.mjs` la función principal `runOrchestrator({ userInput, historicalContext, conversationMessages, config })` basada en un bucle `while` que gestione la invocación a `model-client.mjs`, la validación Zod de `tool_calls` mediante `validateToolArgs`, la ejecución de herramientas y la re-inycción de respuestas `role: "tool"`.
- **Restricciones**:
  - Límite máximo de iteraciones del bucle `while`: `MAX_TOOL_ITERATIONS = 5` para evitar bucles infinitos.
  - Timeout de petición al modelo LLM: `60000ms`.
  - Si la herramienta falla en la validación Zod, enviar el mensaje de error al LLM en la siguiente iteración del buffer.
- **Éxito**: Test unitario simulado en `apps/api/test/agents/orchestrator.agent.test.mjs` demostrando la ejecución de una herramienta simulada en 2 iteraciones y el freno en la iteración 5 si la herramienta solicita llamadas sin fin.

---

### Oleada 4: Ensamblado y Capa de Negocio

#### Tarea 4.1: Orquestación Completa en Servicio de Chat y Persistencia
- **Rol**: Lead Backend Developer
- **Tarea**: Modificar `apps/api/src/services/chat.service.mjs` para integrar el flujo de principio a fin:
  1. Verificar o crear la conversación activa del `userId`.
  2. Verificar que la sesión no exceda `MAX_MESSAGES = 30`.
  3. Ejecutar `retrieveRelevantContext` (`rag.service.mjs`).
  4. Invocar `runOrchestrator` (`orchestrator.agent.mjs`).
  5. Generar embeddings para el mensaje del usuario y la respuesta del asistente.
  6. Guardar ambos mensajes en `message.repository.mjs`.
- **Restricciones**:
  - Respetar el contrato de respuesta HTTP del controlador `/api/chat` (`{ ok: true, content }`).
  - Límite máximo de mensajes por sesión: `MAX_MESSAGES = 30`.
- **Éxito**: Ejecución exitosa de `npm test` verificando que todos los tests unitarios e integrados pasan al 100% en verde.
