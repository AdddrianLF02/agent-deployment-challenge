# Spec 002: Plan de Tareas SDD - Autenticación JWT en Cookies HttpOnly (Backend Pure Focus)

## Plan de Ejecución por Oleadas (Waves)

---

### Oleada 1: Fundaciones (Configuración, Dependencias y Servicio de Dominio)

#### Tarea 1.1: Instalación de Dependencias de Autenticación
- **Rol**: Backend Infrastructure Developer.
- **Tarea**: Modificar `apps/api/package.json` para añadir las dependencias de producción `jsonwebtoken` (`^9.0.2`) y `cookie` (`^1.0.2`).
- **Restricciones**: No modificar scripts ni agregar dependencias redundantes. Mantener la configuración de módulos ES (`"type": "module"`).
- **Éxito**: Ejecutar `npm install` y validar la importación limpia de ambos paquetes ejecutando `node -e "import('jsonwebtoken'); import('cookie');"`.

#### Tarea 1.2: Extensión de la Configuración de Autenticación (`config.mjs`)
- **Rol**: Backend Configuration Developer.
- **Tarea**: Modificar `apps/api/src/config.mjs` para incorporar y validar el objeto `auth` (`adminUsername`, `adminPassword`, `jwtSecret`, `tokenMaxAgeSeconds`) en el retorno de `loadConfig(env)`.
- **Restricciones**: Mantener compatibilidad total con la estructura existente (`model`, `host`, `port`). Proveer valores por defecto seguros para entorno local.
- **Éxito**: Ejecutar `node --check apps/api/src/config.mjs` y actualizar `apps/api/test/config.test.mjs` para verificar la presencia y tipos de `config.auth`.

#### Tarea 1.3: Servicio de Autenticación y Tokens JWT (`auth.service.mjs`)
- **Rol**: Domain Auth Specialist.
- **Tarea**: Crear `apps/api/src/services/auth.service.mjs` exportando las funciones `validateCredentials(username, password, config)`, `signToken(payload, config)`, `verifyToken(token, config)` y `extractTokenFromCookie(cookieHeader)`.
- **Restricciones**: Aislar el uso de `jsonwebtoken` y `cookie` exclusivamente en este módulo. No acoplar con objetos HTTP `req` / `res` de Express.
- **Éxito**: Crear `apps/api/test/services/auth.service.test.mjs` en patrón AAA usando `node:test`. Probar firma, expiración, rechazo de firma alterada y parseo de cookies. Ejecutar `node --test apps/api/test/services/auth.service.test.mjs` en verde.

---

### Oleada 2: Capa HTTP (Middleware Interceptor y Controlador)

#### Tarea 2.1: Middleware Guardián de Autenticación (`auth.middleware.mjs`)
- **Rol**: Security & Express Middleware Developer.
- **Tarea**: Crear `apps/api/src/middlewares/auth.middleware.mjs` exportando `createAuthMiddleware(config)` que intercepte peticiones HTTP, extraiga la cookie `auth_token`, verifique la validez del token con `auth.service.mjs`, retorne `HTTP 401 Unauthorized` si es inválida, o inyecte `req.user` y llame a `next()` si es válida.
- **Restricciones**: Responder de forma consistente con HTTP 401 y cuerpo JSON `{ error: "..." }` sin tragar excepciones descontroladas.
- **Éxito**: Crear `apps/api/test/middlewares/auth.middleware.test.mjs` con `ExpressMother`. Probar bloqueo sin cookie (401), bloqueo con token corrupto (401) e inyección de `req.user` con cookie válida en verde mediante `node --test apps/api/test/middlewares/auth.middleware.test.mjs`.

#### Tarea 2.2: Controlador de Autenticación (`auth.controller.mjs`)
- **Rol**: Express Controller Developer.
- **Tarea**: Crear `apps/api/src/controllers/auth.controller.mjs` exportando `handleLogin(config)`, `handleLogout(config)` y `handleMe(config)`. `handleLogin` validará credenciales y emitirá la cookie `auth_token` con los atributos `HttpOnly; SameSite=Lax; Path=/; Max-Age=<SEC>`.
- **Restricciones**: La cookie JWT debe ser estrictamente `HttpOnly`. `handleLogout` debe expirar la cookie mediante `Max-Age=0`.
- **Éxito**: Crear `apps/api/test/controllers/auth.controller.test.mjs` probando `login` exitoso (200 + `Set-Cookie`), `login` fallido (401 sin cookie), `logout` (200 + cookie expirada) y `me` (200 / 401). Ejecutar `node --test apps/api/test/controllers/auth.controller.test.mjs` en verde.

---

### Oleada 3: Enrutamiento e Integración End-to-End

#### Tarea 3.1: Enrutador de Autenticación (`auth.routes.mjs`)
- **Rol**: API Router Developer.
- **Tarea**: Crear `apps/api/src/routes/auth.routes.mjs` exportando `createAuthRouter(config)` montando `POST /login` (`handleLogin`), `POST /logout` (`handleLogout`) y `GET /me` (`createAuthMiddleware`, `handleMe`).
- **Restricciones**: Usar `express.Router()`. Importar controladores de forma relativa y estricta desde `../controllers/auth.controller.mjs`.
- **Éxito**: Ejecutar `node --check apps/api/src/routes/auth.routes.mjs` sin errores de compilación o importación.

#### Tarea 3.2: Protección de Rutas de Chat (`chat.routes.mjs`)
- **Rol**: API Router Developer.
- **Tarea**: Modificar `apps/api/src/routes/chat.routes.mjs` para inyectar `createAuthMiddleware(config)` antes de `handleChat(config)` en la ruta `POST /`.
- **Restricciones**: No alterar el controlador `chat.controller.mjs` ni el servicio `chat.service.mjs`.
- **Éxito**: Ejecutar `node --check apps/api/src/routes/chat.routes.mjs` verificando la correcta importación y encadenamiento del middleware guardián.

#### Tarea 3.3: Montaje del Enrutador Principal (`routes/index.mjs`)
- **Rol**: API Router Assembler.
- **Tarea**: Modificar `apps/api/src/routes/index.mjs` para importar y registrar `createAuthRouter(config)` montándolo bajo el prefijo `/auth`.
- **Restricciones**: Mantener intacto el montaje existente de `/health` y `/chat`.
- **Éxito**: Ejecutar `node --check apps/api/src/routes/index.mjs` comprobando la resolución de rutas sin errores.

#### Tarea 3.4: Suite de Pruebas de Integración y Verificación Global (`auth.integration.test.mjs`)
- **Rol**: Quality & Integration Engineer.
- **Tarea**: Crear `apps/api/test/integration/auth.integration.test.mjs` verificando el flujo completo de autenticación y protección de chat usando `createApp(config)`:
  1. Petición a `POST /api/chat` sin autenticación $\rightarrow$ HTTP 401 Unauthorized.
  2. Petición a `POST /api/auth/login` con credenciales válidas $\rightarrow$ HTTP 200 + cabecera `Set-Cookie` presente.
  3. Petición a `POST /api/chat` enviando la cookie obtenida $\rightarrow$ la petición pasa el guardián de autenticación.
  4. Petición a `POST /api/auth/logout` $\rightarrow$ se elimina la cookie de sesión.
- **Restricciones**: No romper los tests existentes de `health` o `config`. La suite completa debe ejecutarse en verde.
- **Éxito**: Ejecutar `npm run check` garantizando que todos los unitarios e integración pasan al 100% y la compilación global finaliza sin errores.
