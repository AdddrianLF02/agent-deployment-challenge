# Spec 002: Plan de Diseño Técnico - Autenticación JWT en Cookies HttpOnly (Backend Pure Focus)

## 1. Resumen de Arquitectura

El objetivo de esta fase es implementar el sistema de autenticación basado en **JSON Web Tokens (JWT)** almacenados en **Cookies `HttpOnly`** para proteger la API Express (`apps/api`), aislar el acceso a endpoints sensibles (`POST /api/chat`) y establecer la base para la aislación de contexto por usuario (tenant isolation), en estricto cumplimiento de [ADR 0002](file:///c:/Proyectos/agent-deployment-challenge/docs/adr/0002-jwt-httponly-cookie-auth.md) y la Arquitectura por Capas ([ADR 0001](file:///c:/Proyectos/agent-deployment-challenge/docs/adr/0001-layered-architecture.md)).

### Restricciones Clave:
- **Aislamiento Backend Puro**: Esta fase se limita exclusivamente a `apps/api`. No se modificará el frontend (`apps/web`) ni la capa RAG/pgvector hasta oleadas posteriores.
- **Sin Breaking Changes en Endpoints Existentes**: `GET /api/health` debe permanecer público e inalterado.
- **Seguridad HttpOnly & Stateless**: Las cookies deben llevar los atributos `HttpOnly`, `SameSite=Lax`, `Path=/` y caducidad configurable. No se utilizará persistencia de sesiones en disco ni en base de datos.
- **Defensa en Profundidad & Observabilidad**: Toda petición rechazada por falta de autenticación debe responder `HTTP 401 Unauthorized` de forma defensiva y predecible.

---

## 2. Dependencias del Backend (`apps/api/package.json`)

Para mantener el sistema ligero y con cero sobrecarga innecesaria, se incorporan únicamente los siguientes paquetes estándar al backend:

- `jsonwebtoken` (`^9.0.2`): Manejo de firma (`HS256`) y verificación sintáctica y criptográfica de tokens JWT.
- `cookie` (`^1.0.2`): Parseo eficiente de cabeceras HTTP `Cookie` y generación formativa de cabeceras `Set-Cookie`.

---

## 3. Modificaciones en la Configuración (`apps/api/src/config.mjs`)

Se extenderá `loadConfig(env = process.env)` para exponer el objeto `config.auth` validando las credenciales administrativas y el secreto de firma JWT:

```javascript
auth: {
  adminUsername: env.ADMIN_USERNAME?.trim() || "admin",
  adminPassword: env.ADMIN_PASSWORD?.trim() || "admin123",
  jwtSecret: env.JWT_SECRET?.trim() || "dev-jwt-secret-min-32-chars-key!!",
  tokenMaxAgeSeconds: parsePositiveInteger(env.JWT_EXPIRES_IN_SECONDS, 86400, "JWT_EXPIRES_IN_SECONDS"),
}
```

---

## 4. Estructura de Módulos Propuesta

```text
apps/api/
├── src/
│   ├── services/
│   │   └── auth.service.mjs          # Lógica de dominio: validación de credenciales, firma y verificación JWT, parseo de cookies
│   ├── controllers/
│   │   └── auth.controller.mjs       # Controladores HTTP: login, logout, me
│   ├── middlewares/
│   │   └── auth.middleware.mjs       # Guardián/middleware de autenticación para rutas protegidas (/api/chat)
│   ├── routes/
│   │   ├── auth.routes.mjs           # Declaración de rutas de autenticación (/login, /logout, /me)
│   │   ├── chat.routes.mjs           # Inyección del auth.middleware en POST /api/chat
│   │   └── index.mjs                 # Enrutador principal montando /api/auth y /api/chat
│   └── config.mjs                    # Extensión de configuración para parámetros de auth
└── test/
    ├── services/
    │   └── auth.service.test.mjs     # Tests unitarios del servicio de autenticación y tokens JWT
    ├── middlewares/
    │   └── auth.middleware.test.mjs  # Tests unitarios del middleware interceptor de cookies
    ├── controllers/
    │   └── auth.controller.test.mjs  # Tests unitarios de controladores login/logout/me
    └── integration/
        └── auth.integration.test.mjs # Tests de integración end-to-end de autenticación y protección de chat
```

### Radiografía de Cambios (Formato Delta SDD):
- **[+] ADDED**: `apps/api/src/services/auth.service.mjs`
- **[+] ADDED**: `apps/api/src/controllers/auth.controller.mjs`
- **[+] ADDED**: `apps/api/src/middlewares/auth.middleware.mjs`
- **[+] ADDED**: `apps/api/src/routes/auth.routes.mjs`
- **[+] ADDED**: `apps/api/test/services/auth.service.test.mjs`
- **[+] ADDED**: `apps/api/test/middlewares/auth.middleware.test.mjs`
- **[+] ADDED**: `apps/api/test/controllers/auth.controller.test.mjs`
- **[+] ADDED**: `apps/api/test/integration/auth.integration.test.mjs`
- **[~] MODIFIED**: `apps/api/src/config.mjs` (Soporte de credenciales admin y JWT)
- **[~] MODIFIED**: `apps/api/src/routes/chat.routes.mjs` (Protección de `POST /api/chat` mediante `createAuthMiddleware(config)`)
- **[~] MODIFIED**: `apps/api/src/routes/index.mjs` (Montaje de `/api/auth`)
- **[~] MODIFIED**: `apps/api/package.json` (Adición de `jsonwebtoken` y `cookie`)

---

## 5. Definición Detallada de Capas y Firmas de Código

### 5.1 Capa de Servicios (`services/auth.service.mjs`)
- `validateCredentials(username, password, config)`: Retorna `true` si `username === config.auth.adminUsername` y `password === config.auth.adminPassword`.
- `signToken(payload, config)`: Emite un token JWT usando `jwt.sign(payload, config.auth.jwtSecret, { expiresIn: config.auth.tokenMaxAgeSeconds })`.
- `verifyToken(token, config)`: Valida el JWT con `jwt.verify(token, config.auth.jwtSecret)`. Retorna el payload decodificado `{ username, role }` o `null` si la firma o expiración es inválida.
- `extractTokenFromCookie(cookieHeader)`: Extrae el valor de la cookie `auth_token` desde la cabecera `Cookie`.

### 5.2 Capa de Controladores (`controllers/auth.controller.mjs`)
- `handleLogin(config)`:
  - Lee `{ username, password }` del cuerpo de la petición.
  - Si la validación de credenciales falla $\rightarrow$ retorna `HTTP 401 Unauthorized` con `{ error: "Credenciales inválidas" }`.
  - Si es válida $\rightarrow$ firma el token JWT, genera la cabecera `Set-Cookie` (`auth_token=<JWT>; HttpOnly; SameSite=Lax; Path=/; Max-Age=<SEC>`) y retorna `HTTP 200 OK` con `{ ok: true, user: { username } }`.
- `handleLogout(config)`:
  - Genera la cabecera `Set-Cookie` expirada (`auth_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`).
  - Retorna `HTTP 200 OK` con `{ ok: true }`.
- `handleMe(config)`:
  - Retorna `HTTP 200 OK` con `{ authenticated: true, user: req.user }` si la petición pasó por el middleware de auth, o `HTTP 401 Unauthorized` si no hay sesión.

### 5.3 Capa de Middlewares (`middlewares/auth.middleware.mjs`)
- `createAuthMiddleware(config)`:
  - Factory que retorna una función Express `(req, res, next)`.
  - Extrae `auth_token` de `req.headers.cookie`.
  - Llama a `authService.verifyToken(token, config)`.
  - Si el token falta o es inválido $\rightarrow$ responde `HTTP 401 Unauthorized` con `{ error: "No autorizado. Token no proporcionado o inválido." }`.
  - Si el token es válido $\rightarrow$ inyecta `req.user = decodedPayload` y llama a `next()`.

---

## 6. Plan de Pruebas y Verificación (AAA Pattern)

Todas las pruebas se desarrollarán utilizando el runner nativo `node:test` y respetando el patrón AAA (Arrange, Act, Assert) e inyección de Object Mothers (`ExpressMother`).

| Tipo de Test | Archivo | Casos a Verificar |
|---|---|---|
| **Unidad (Servicios)** | `test/services/auth.service.test.mjs` | 1. Firma y verificación criptográfica correcta de JWT.<br>2. Rechazo de tokens manipulados o expirados.<br>3. Validación de credenciales admin. |
| **Unidad (Middleware)** | `test/middlewares/auth.middleware.test.mjs` | 1. Bloqueo 401 cuando no existe cabecera `Cookie`.<br>2. Bloqueo 401 cuando la cookie contiene un token corrupto.<br>3. Inyección de `req.user` y llamada a `next()` con cookie válida. |
| **Unidad (Controladores)** | `test/controllers/auth.controller.test.mjs` | 1. Login exitoso emite `Set-Cookie` HttpOnly.<br>2. Login fallido retorna 401 sin emitir cookie.<br>3. Logout expira la cookie con Max-Age 0. |
| **Integración End-to-End** | `test/integration/auth.integration.test.mjs` | 1. Petición a `POST /api/chat` sin autenticación retorna HTTP 401.<br>2. Flujo completo: Login `POST /api/auth/login` $\rightarrow$ extracción de cookie $\rightarrow$ petición a `POST /api/chat` con cookie en cabecera $\rightarrow$ respuesta HTTP 200 exitosa. |

---

## 7. Criterios de Aceptación (Definition of Done)

1. `npm test` ejecuta todos los unitarios e integración pasando el 100% de los tests.
2. `npm run check` compila la aplicación y ejecuta la suite sin advertencias ni errores.
3. No se rompe el contrato existente de `GET /api/health`.
