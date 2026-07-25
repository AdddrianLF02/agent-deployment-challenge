# Spec: Refactorización a Arquitectura por Capas - Plan Técnico

## 1. Resumen de Arquitectura

El objetivo principal de esta fase es refactorizar la aplicación backend (`apps/api/src/server.mjs`) que concentraba la lógica de ruteo, controladores, estáticos y manejo de errores inline, separándola en una **Arquitectura por Capas** conforme a [ADR 0001](file:///c:/Proyectos/agent-deployment-challenge/docs/adr/0001-layered-architecture.md) y `AGENTS.md`.

### Restricciones Clave:
- **Sin Breaking Changes**: `config.mjs`, `messages.mjs` y `model-client.mjs` deben conservarse intactos.
- **Firma `createApp(config)`**: Debe mantener exactamente la misma firma y comportamiento exportado desde `apps/api/src/server.mjs` para no romper `server.test.mjs` ni la ejecucion de la API.

---

## 2. Estructura de Módulos Propuesta

```text
apps/api/src/
├── middlewares/
│   ├── security.middleware.mjs  # Headers de seguridad y desactivación de x-powered-by
│   ├── static.middleware.mjs    # Servido de assets estáticos y fallback SPA (index.html)
│   └── error.middleware.mjs     # Manejo global de errores (413 body limit, JSON sintaxis, 404)
├── services/
│   └── chat.service.mjs         # Lógica de negocio para procesamiento de chat y llamada al LLM
├── controllers/
│   ├── health.controller.mjs    # Manejador HTTP para GET /api/health
│   └── chat.controller.mjs      # Manejador HTTP para POST /api/chat
├── routes/
│   ├── health.routes.mjs        # Declaración de ruta GET /api/health
│   ├── chat.routes.mjs          # Declaración de ruta POST /api/chat
│   └── index.mjs                # Enrutador principal que agrupa las rutas de la API
├── schemas/
│   └── .gitkeep                 # Capa de esquemas Zod (instanciada para futuras validaciones)
├── agents/
│   └── .gitkeep                 # Capa de orquestación de agentes (instanciada para motor LLM y tools)
├── repositories/
│   └── .gitkeep                 # Capa de persistencia (instanciada para Postgres / pgvector)
├── config.mjs                   # (Intacto) Carga y validación de configuración
├── messages.mjs                 # (Intacto) Validación de mensajes de chat
├── model-client.mjs             # (Intacto) Cliente HTTP para la API del LLM
└── server.mjs                   # Punto de entrada unificado y ensamblador Express
```

### 2.1 Radiografía de Cambios (Formato Delta SDD)

- **[+] ADDED**: `apps/api/src/middlewares/security.middleware.mjs`
- **[+] ADDED**: `apps/api/src/middlewares/static.middleware.mjs`
- **[+] ADDED**: `apps/api/src/middlewares/error.middleware.mjs`
- **[+] ADDED**: `apps/api/src/services/chat.service.mjs`
- **[+] ADDED**: `apps/api/src/controllers/health.controller.mjs`
- **[+] ADDED**: `apps/api/src/controllers/chat.controller.mjs`
- **[+] ADDED**: `apps/api/src/routes/health.routes.mjs`
- **[+] ADDED**: `apps/api/src/routes/chat.routes.mjs`
- **[+] ADDED**: `apps/api/src/routes/index.mjs`
- **[+] ADDED**: `apps/api/src/schemas/.gitkeep`
- **[+] ADDED**: `apps/api/src/agents/.gitkeep`
- **[+] ADDED**: `apps/api/src/repositories/.gitkeep`
- **[~] MODIFIED**: `apps/api/src/server.mjs` (Se refactoriza para actuar exclusivamente como ensamblador de capas Express y expone `createApp` y `startServer`)
- **[=] UNTOUCHED**: `apps/api/src/config.mjs`
- **[=] UNTOUCHED**: `apps/api/src/messages.mjs`
- **[=] UNTOUCHED**: `apps/api/src/model-client.mjs`
- **[-] REMOVED**: (Ninguno; las funciones e instanciaciones inline se reubican quirúrgicamente en controladores, servicios y middlewares)

---

## 3. Definición de Capas y Contratos

### Capa de Middlewares (`middlewares/`)
1. **`security.middleware.mjs`**:
   - Aplica `app.disable("x-powered-by")`.
   - Inyecta cabeceras `referrer-policy`, `x-content-type-options`, `x-frame-options`.
2. **`static.middleware.mjs`**:
   - Verifica existencia de `web/dist` y sirve archivos estáticos.
   - Proporciona fallback SPA a `index.html` excluyendo rutas `/api/*`.
3. **`error.middleware.mjs`**:
   - Captura errores 413 (Payload Too Large).
   - Captura `SyntaxError` de JSON malformado (400 Bad Request).
   - Manejador final 404 (Not Found).

### Capa de Servicios (`services/`)
1. **`chat.service.mjs`**:
   - Encapsula la llamada a `validateMessages` y `requestCompletion`.
   - Retorna `{ success: true, content }` o lanza `ModelRequestError` / errores de validación.

### Capa de Controladores (`controllers/`)
1. **`health.controller.mjs`**:
   - `getHealth(config)`: Retorna la respuesta formateada de estado y modelo configurado.
2. **`chat.controller.mjs`**:
   - `handleChat(config)`: Genera `requestId` (`crypto.randomUUID()`), verifica `config.modelConfigured`, ejecuta validación, llama a `chat.service` y captura excepciones con los códigos de estado apropiados (503, 400, 502/504/500).

### Capa de Rutas (`routes/`)
1. **`health.routes.mjs`**: Router express montando `GET /` con `health.controller`.
2. **`chat.routes.mjs`**: Router express montando `POST /` con `chat.controller`.
3. **`index.mjs`**: Agrupa `/api/health` y `/api/chat`.

### Capas Canónicas Instanciadas (Placeholders para fases posteriores)
1. **`schemas/`**: Instanciado con `.gitkeep`. Alojará esquemas de validación runtime Zod en siguientes iteraciones.
2. **`agents/`**: Instanciado con `.gitkeep`. Alojará el motor de orquestación, prompts y herramientas del agente (ADR 0004).
3. **`repositories/`**: Instanciado con `.gitkeep`. Alojará la capa de acceso a base de datos PostgreSQL y pgvector (ADR 0003).

### Ensamblador (`server.mjs`)
- Crea la aplicación Express.
- Registra middlewares globales (`security`, `express.json({ limit: "64kb" })`).
- Monta enrutador principal (`routes/index.mjs`).
- Registra middleware de estáticos (`static.middleware.mjs`).
- Registra middlewares de error (`error.middleware.mjs`).

---

## 4. Plan de Verificación y Criterios de Éxito

| Criterio | Comando / Prueba | Resultado Esperado |
|---|---|---|
| Sintaxis y Pruebas Backend | `npm test` | Todos los tests en `apps/api/test` pasan sin fallos. |
| Verificación Completa | `npm run check` | Ejecuta tests y build de web sin errores de importación o sintaxis. |
| Servidor en Vivo | `npm start` | Inicia el servidor unificado en el puerto configurado (4319). |
| Endpoint Health | `curl http://localhost:4319/api/health` | HTTP 200 OK con `{ status: "ok", model: ... }` |
