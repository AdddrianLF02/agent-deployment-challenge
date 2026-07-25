# Spec: Refactorización a Arquitectura por Capas - Plan de Tareas SDD

## Plan de Ejecución por Oleadas (Waves)

---

### Oleada 1: Estructura Canónica y Middlewares de Infraestructura

#### Tarea 1.1: Instanciación del Árbol de Directorios Canónico
- **Rol**: Backend Architect / Repository Engineer.
- **Tarea**: Crear las 7 carpetas de la arquitectura por capas en `apps/api/src/` (`routes/`, `controllers/`, `services/`, `middlewares/`, `schemas/`, `agents/`, `repositories/`) e instanciar archivos `.gitkeep` en las capas placeholder (`schemas/`, `agents/`, `repositories/`).
- **Restricciones**: No modificar ningún archivo existente en `apps/api/src/`.
- **Éxito**: Ejecutar en la terminal `ls apps/api/src/*/` (o verificación de existencia en PowerShell) confirmando la existencia física de las 7 carpetas y sus 3 archivos `.gitkeep`.

#### Tarea 1.2: Middleware de Seguridad (`security.middleware.mjs`)
- **Rol**: Security & Middleware Developer.
- **Tarea**: Crear `apps/api/src/middlewares/security.middleware.mjs` exportando una función middleware que inyecte las cabeceras `referrer-policy: no-referrer`, `x-content-type-options: nosniff` y `x-frame-options: DENY`.
- **Restricciones**: Utilizar exclusivamente sintaxis de Node.js 22 ES Modules (`.mjs`). No agregar dependencias de terceros.
- **Éxito**: Ejecutar `node --check apps/api/src/middlewares/security.middleware.mjs` e incluir la creación de tests unitarios en `apps/api/test/middlewares/security.middleware.test.mjs` comprobando que pase en verde.

#### Tarea 1.3: Middleware de Estáticos y Fallback SPA (`static.middleware.mjs`)
- **Rol**: Frontend Integration & Middleware Developer.
- **Tarea**: Crear `apps/api/src/middlewares/static.middleware.mjs` exportando una función `registerStaticMiddleware(app)` que verifique si existe `apps/web/dist`, registre `express.static` y agregue el middleware de fallback SPA enviando `index.html` para peticiones GET que no comiencen por `/api/`.
- **Restricciones**: Mantener resolución de rutas absoluta usando `fileURLToPath` e `import.meta.url`.
- **Éxito**: Ejecutar `node --check apps/api/src/middlewares/static.middleware.mjs` sin errores de compilación o sintaxis.

#### Tarea 1.4: Middleware Global de Manejo de Errores (`error.middleware.mjs`)
- **Rol**: Express Error Handling Specialist.
- **Tarea**: Crear `apps/api/src/middlewares/error.middleware.mjs` exportando `errorHandlerMiddleware` (que procese errores 413 Payload Too Large, SyntaxError 400 Bad Request, y fallback catch-all HTTP 500 JSON) y `notFoundHandlerMiddleware` (que responda HTTP 404 `{ error: "Not found" }`).
- **Restricciones ajustadas**: Preservar exactamente los mensajes de error JSON **extrayéndolos de la lógica original en `server.mjs`** y mantener las firmas de error Express `(error, req, res, next)`.
- **Éxito**: Ejecutar `node --check apps/api/src/middlewares/error.middleware.mjs` e incluir la creación de tests unitarios en `apps/api/test/middlewares/error.middleware.test.mjs` comprobando que pase en verde.

---

### Oleada 2: Capa de Servicios y Controladores de Dominio

#### Tarea 2.1: Servicio de Orquestación de Chat (`chat.service.mjs`)
- **Rol**: Domain Logic Developer.
- **Tarea**: Crear `apps/api/src/services/chat.service.mjs` exportando la función `processChatCompletion({ model, messages })` que ejecute `validateMessages(messages)` y llame a `requestCompletion({ model, messages: validation.messages })`.
- **Restricciones**: Importar y usar strictly los módulos existentes `messages.mjs` y `model-client.mjs` sin alterar su código.
- **Éxito**: Ejecutar `node --check apps/api/src/services/chat.service.mjs` e incluir la creación de tests unitarios en `apps/api/test/services/chat.service.test.mjs` comprobando que pase en verde.

#### Tarea 2.2: Controlador de Health (`health.controller.mjs`)
- **Rol**: Express Controller Developer.
- **Tarea**: Crear `apps/api/src/controllers/health.controller.mjs` exportando `getHealth(config)` que retorne HTTP 200 OK con la estructura `{ status: "ok", model: { configured: config.modelConfigured, name: config.modelConfigured ? config.model.name : null } }`.
- **Restricciones**: No leer `process.env` directamente; usar el objeto `config` inyectado.
- **Éxito**: Ejecutar `node --check apps/api/src/controllers/health.controller.mjs` e incluir la creación de tests unitarios en `apps/api/test/controllers/health.controller.test.mjs` comprobando que pase en verde.

#### Tarea 2.3: Controlador de Chat (`chat.controller.mjs`)
- **Rol**: Express Controller Developer.
- **Tarea**: Crear `apps/api/src/controllers/chat.controller.mjs` exportando `handleChat(config)` que genere `requestId` con `crypto.randomUUID()`, valide `config.modelConfigured` (devolviendo estrictamente HTTP 503 si es falso), delegue a `chat.service.mjs` y maneje excepciones de `ModelRequestError` o errores genéricos con logging contextual `[requestId]`.
- **Restricciones**: Preservar los formatos exactos de respuesta de error `{ error, requestId }` y códigos HTTP (503, 400, 502, 504, 500) extrayéndolos de la lógica original en `server.mjs`.
- **Éxito**: Ejecutar `node --check apps/api/src/controllers/chat.controller.mjs` e incluir la creación de tests unitarios en `apps/api/test/controllers/chat.controller.test.mjs` comprobando que pase en verde.

---

### Oleada 3: Capa de Rutas

#### Tarea 3.1: Enrutador de Health (`health.routes.mjs`)
- **Rol**: API Router Developer.
- **Tarea**: Crear `apps/api/src/routes/health.routes.mjs` exportando `createHealthRouter(config)` montando `GET /` usando `health.controller.mjs`.
- **Restricciones**: Usar `express.Router()`. Importar el controlador de forma absoluta y estricta desde `../controllers/health.controller.mjs`.
- **Éxito**: Ejecutar `node --check apps/api/src/routes/health.routes.mjs` con éxito.

#### Tarea 3.2: Enrutador de Chat (`chat.routes.mjs`)
- **Rol**: API Router Developer.
- **Tarea**: Crear `apps/api/src/routes/chat.routes.mjs` exportando `createChatRouter(config)` montando `POST /` usando `chat.controller.mjs`.
- **Restricciones**: Usar `express.Router()`. Importar el controlador de forma absoluta y estricta desde `../controllers/chat.controller.mjs`.
- **Éxito**: Ejecutar `node --check apps/api/src/routes/chat.routes.mjs` con éxito.

#### Tarea 3.3: Enrutador Principal de la API (`index.mjs`)
- **Rol**: API Router Assembler.
- **Tarea**: Crear `apps/api/src/routes/index.mjs` exportando `createApiRouter(config)` que cree un router Express principal y monte `/health` con `createHealthRouter(config)` y `/chat` con `createChatRouter(config)`.
- **Restricciones**: No registrar rutas fuera de `/api/` en este módulo.
- **Éxito**: Ejecutar `node --check apps/api/src/routes/index.mjs` sin errores de importación.

---

### Oleada 4: Ensamblado del Servidor y Verificación de Contratos

#### Tarea 4.1: Ensamblado Final de `server.mjs`
- **Rol**: Lead Backend & Systems Integrator.
- **Tarea**: Refactorizar `apps/api/src/server.mjs` limpiando toda la lógica de enrutamiento inline antigua. Conectar los middlewares creados en la Oleada 1 (`security.middleware.mjs`, `static.middleware.mjs`, `error.middleware.mjs`), `express.json({ limit: "64kb" })`, y el enrutador principal `createApiRouter(config)` bajo el preffijo `/api`. Exportar las funciones `createApp(config)` y `startServer(config)`. 
- **Restricciones**:
    · Importar explícitamente los módulos desde `./middlewares/` y `./routes/index.mjs`.
    · Mantener intacta la firma y comportamiento exportado de `createApp(config)` y `startServer(config)`. 
    · No romper `apps/api/test/server.test.mjs`.
- **Éxito**: Ejecutar `npm run check` garantizando que no hay errores de sintaxis o importación aislados. Luego, ejecutar `npm test` en la suite de `apps/api` y validar que el 100% de las pruebas (`server.test.mjs`, `config.test.mjs`, `messages.test.mjs`, `model-client.test.mjs`) pasan en verde.
