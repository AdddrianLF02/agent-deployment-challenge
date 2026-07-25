# Spec 002: Autenticación JWT en Cookies HttpOnly y Tenant Isolation

## Fase 1: Requisitos & Análisis de Impacto (`/speckit.analyze`)

### Impact Report (Radiografía Inicial del Repositorio)

1. **Estado Actual de la API (`apps/api`)**:
   - Actualmente `/api/chat` y `/api/health` son endpoints públicos accesibles sin restricciones.
   - No existen módulos de autenticación, controladores de auth, ni middlewares de verificación de tokens en `apps/api/src/middlewares/`.
   - `apps/api/package.json` solo cuenta con `express` y `dotenv` como dependencias. No hay paquete de JWT ni manejo de cookies nativo instalado aún.
   - `apps/api/src/config.mjs` no valida variables de entorno de autenticación (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`).

2. **Alcance de Cambios Solicitados**:
   - **Configuración (`config.mjs`)**: Incorporar `ADMIN_USERNAME`, `ADMIN_PASSWORD` y `JWT_SECRET` con valores por defecto seguros para desarrollo local.
   - **Nuevos Endpoints (`routes/auth.routes.mjs` & `controllers/auth.controller.mjs`)**:
     - `POST /api/auth/login`: Autentica credenciales y establece la cookie `HttpOnly`.
     - `POST /api/auth/logout`: Invalida la cookie de sesión borrándola.
     - `GET /api/auth/me`: Verifica el estado de autenticación actual del usuario.
   - **Middleware de Autenticación (`middlewares/auth.middleware.mjs`)**: Intercepta `/api/chat`, valida la firma y vigencia del JWT desde la cookie `HttpOnly` e inyecta la identidad del usuario (`req.user`) en el contexto del request.
   - **Aislación de Memoria RAG (Tenant Isolation)**: La identidad extraída por `authMiddleware` alimentará la consulta de memoria vectorial para aislar el contexto por usuario.

---

### Criterios de Aceptación (Notación EARS)

* **Cuando** se envíe una petición `POST /api/auth/login` con credenciales válidas que coincidan con `ADMIN_USERNAME` y `ADMIN_PASSWORD`, **el sistema debe** responder con HTTP 200, un cuerpo `{ ok: true, user: { username } }` y adjuntar la cookie `auth_token` firmada con los flags `HttpOnly`, `SameSite=Lax`, `Path=/` y duración de 24h.

* **Cuando** se envíe `POST /api/auth/login` con credenciales incorrectas, **el sistema debe** responder con HTTP 401 Unauthorized `{ error: "Credenciales inválidas" }` sin establecer cookies.

* **Mientras** la cookie `auth_token` no esté presente, esté expirada o posea una firma inválida, **cuando** el cliente intente acceder a `/api/chat`, **el sistema debe** responder inmediatamente con HTTP 401 Unauthorized y no procesar la petición del LLM.

* **Mientras** el usuario tenga una cookie `auth_token` válida, **cuando** realice una petición `POST /api/chat`, **el sistema debe** permitir el paso al controlador, inyectando `req.user` con los datos decodificados del token.

* **Cuando** se envíe una petición `POST /api/auth/logout`, **el sistema debe** responder con HTTP 200 OK y sobrescribir la cookie `auth_token` expirándola inmediatamente (`maxAge: 0`).

* **Mientras** el servidor esté activo, **cuando** reciba una petición GET en `/api/health`, **el sistema debe** responder con status 200 OK sin requerir autenticación previa.

---

### Guardarraíles de Seguridad & Casos Límite

1. **Protección XSS**: La cookie JWT NUNCA debe ser accesible mediante JS (`HttpOnly = true`).
2. **Mitigación CSRF**: La cookie se configurará con `SameSite = Lax` para mitigar ataques cross-site en peticiones estándar.
3. **Manejo de Errores Defensivo**: Tokens corruptos, firmados con un secreto antiguo o manipulados no deben causar fallos 500 descontrolados, sino retornar 401 explícito con borrado defensivo de la cookie.
