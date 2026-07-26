# Spec 006: Despliegue con Docker y Docker Compose (ADR 0006)

## Fase 1: Requisitos & Análisis de Impacto (`/speckit.analyze`)

### Impact Report (Radiografía Inicial del Repositorio)

1. **Contexto Brownfield**:
   El proyecto actual es un entorno de arquitectura por capas en Node.js 22 (`apps/api`) y React Vite (`apps/web`). El servidor API en `apps/api/src/server.mjs` requiere asegurar la llamada explícita al pool de la base de datos `getPool(config)` en la secuencia de inicio para ejecutar migraciones PostgreSQL antes de recibir tráfico HTTP.

2. **Radiografía Delta de Cambios (Estricta)**:
   - `[+] ADDED` `Dockerfile`: Configuración de build multi-stage (Node.js 22 Alpine) que compila el frontend en `apps/web/dist` y empaqueta el servidor unificado `apps/api`.
   - `[+] ADDED` `docker-compose.yml`: Orquestación de servicios en contenedores para `api` (Node 22) y `db` (`pgvector/pgvector:pg16`), incluyendo `healthcheck`, variables de entorno y volumen persistente `pgdata`.
   - `[+] ADDED` `.dockerignore`: Exclusión de `node_modules`, `.git`, `.gemini`, `dist` y temporales para optimizar el contexto de build de Docker.
   - `[~] MODIFIED` `apps/api/src/server.mjs`: Modificación quirúrgica de la secuencia de arranque `startServer()` para invocar `getPool(config)` antes de `runMigrations(config)`.
   - `[-] REMOVED` N/A (Sin eliminación de componentes preexistentes).

3. **Preservación e Invariantes**:
   - Conservación total de contratos HTTP existentes (`GET /api/health`, `POST /api/chat`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`).
   - Conservación de la lógica de autenticación JWT HttpOnly cookies, validación Zod y aislamiento por usuario en repositorios PostgreSQL.

---

### Criterios de Aceptación (Notación EARS)

* **Mientras** la infraestructura en contenedores esté activa, **cuando** el servicio `api` inicie su proceso `startServer()`, **el sistema debe** invocar `getPool(config)` y ejecutar las migraciones de PostgreSQL (`users`, `conversations`, `messages` e índice vector HNSW) antes de empezar a escuchar peticiones HTTP.

* **Cuando** se ejecute el comando `docker compose up --build`, **el sistema debe** compilar los assets del frontend (`apps/web/dist`), empaquetar la imagen `api` multi-stage y levantar el contenedor `db` con la extensión `pgvector` lista antes de iniciar la API.

* **Cuando** un cliente no autenticado realice una petición a `POST /api/chat`, **el sistema debe** responder con código HTTP `401 Unauthorized`.

* **Cuando** un usuario envíe credenciales válidas (`admin` / `admin`) a `POST /api/auth/login`, **el sistema debe** autenticar al usuario, persistirlo en la tabla `users` de PostgreSQL (si no existía) y responder HTTP `200 OK` adjuntando la cookie segura `auth_token` HttpOnly.

* **Cuando** los contenedores se reinicien mediante `docker compose restart`, **el sistema debe** conservar los usuarios, conversaciones y vector embeddings intactos gracias al volumen `pgdata`.

