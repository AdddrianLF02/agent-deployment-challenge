# Spec: Despliegue con Docker y Docker Compose - Plan Técnico

## 1. Resumen de Arquitectura

Esta especificación materializa la infraestructura de producción y contenedorización definida en [ADR 0006](file:///c:/proyectos/agent-deployment-challenge/docs/adr/0006-docker-compose-deployment.md). El objetivo es pasar el sistema brownfield de un modo de desarrollo local aislado a una plataforma desplegable en VPS basada en contenedores Docker y Docker Compose.

### Restricciones Clave:
- **Sin Breaking Changes**: Todos los módulos de API, middleware, esquemas y endpoints existentes permanecen 100% compatibles.
- **Inicialización de BD**: Garantizar que `startServer()` en `apps/api/src/server.mjs` inicialice el pool PostgreSQL (`getPool(config)`) antes de ejecutar las migraciones.
- **Construcción Eficiente**: `Dockerfile` multi-stage ligero basado en `node:22-alpine` para reducir el tamaño final de la imagen y tiempos de despliegue.

---

## 2. Radiografía de Cambios (Formato Delta SDD)

- **[+] ADDED**: `.dockerignore`
- **[+] ADDED**: `Dockerfile`
- **[+] ADDED**: `docker-compose.yml`
- **[+] ADDED**: `specs/006-docker-compose-deployment/01-specify.md`
- **[+] ADDED**: `specs/006-docker-compose-deployment/02-plan.md`
- **[+] ADDED**: `specs/006-docker-compose-deployment/03-tasks.md`
- **[~] MODIFIED**: `apps/api/src/server.mjs` (Llamada inicial a `getPool(config)` en `startServer`)
- **[=] UNTOUCHED**: `apps/api/src/repositories/db.mjs`
- **[=] UNTOUCHED**: `apps/api/src/repositories/migrations.mjs`
- **[=] UNTOUCHED**: `apps/api/src/repositories/user.repository.mjs`
- **[=] UNTOUCHED**: `apps/web/*`
- **[-] REMOVED**: Ninguno

---

## 3. Estructura de Infraestructura y Servicios

```text
.
├── .dockerignore                # Exclusión de artefactos locales (node_modules, dist, etc.)
├── Dockerfile                   # Multi-stage build (Stage 1: build React web; Stage 2: Express runner)
├── docker-compose.yml           # IaC para orquestar servicios api y postgres (pgvector)
└── apps/
    └── api/src/
        └── server.mjs           # [MODIFIED] Se añade getPool(config) en arranque
```

### 3.1 Especificación del Dockerfile Multi-Stage

```dockerfile
# Stage 1: Build Frontend Web
FROM node:22-alpine AS web-builder
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci
COPY apps/web ./apps/web
RUN npm run build --workspace=apps/web

# Stage 2: Runtime Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci --omit=dev
COPY apps/api ./apps/api
COPY --from=web-builder /app/apps/web/dist ./apps/web/dist

EXPOSE 4319
CMD ["npm", "start"]
```

### 3.2 Especificación de Docker Compose (`docker-compose.yml`)

- **Servicio `db`**:
  - Imagen: `pgvector/pgvector:pg16`
  - Variables de entorno: `POSTGRES_DB=agent_platform`, `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`
  - Puerto: `5432:5432`
  - Volumen: `pgdata:/var/lib/postgresql/data`
  - Healthcheck: `pg_isready -U postgres -d agent_platform`

- **Servicio `api`**:
  - Build: `. (contexto raíz)`
  - Puertos: `4319:4319`
  - Variables de entorno: `PORT=4319`, `HOST=0.0.0.0`, `PGHOST=db`, `PGPORT=5432`, `PGDATABASE=agent_platform`, `PGUSER=postgres`, `PGPASSWORD=postgres`, `JWT_SECRET=production_jwt_secret_key_change_me`
  - Dependencias: `depends_on: db (condition: service_healthy)`

---

## 4. Estrategia de Migración de Base de Datos y Autenticación

1. Al ejecutarse `docker-compose up`, la base de datos `db` ejecuta el contenedor `pgvector/pgvector:pg16` e inicializa el healthcheck en el puerto `5432`.
2. Al arrancar `startServer()` en el contenedor `api`, `getPool(config)` establece la conexión cliente activa con `db:5432`.
3. `runMigrations(config)` detecta `isDatabaseConnected() === true` y ejecuta las sentencias SQL:
   - `CREATE EXTENSION IF NOT EXISTS vector;`
   - `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
   - Creación de las tablas `users`, `conversations` y `messages`.
   - Creación del índice vectorial HNSW `messages_embedding_hnsw_idx`.
4. El endpoint `POST /api/auth/login` valida credenciales `admin`/`admin`. Si el usuario no existe en la tabla `users`, `validateCredentials()` invoca `createUser()` e inserta el usuario en PostgreSQL con su hash SHA-256.

---

## 5. Matriz de Cobertura de Verificación

| Criterio | Comando / Prueba | Resultado Esperado |
|---|---|---|
| Sintaxis y Pruebas Backend | `npm test` | Todos los 59 tests pasan al 100% en verde. |
| Verificación Completa | `npm run check` | Test y build ejecutados sin advertencias ni errores. |
| Despliegue de Contenedores | `docker compose up --build` | Contenedores `db` y `api` en estado healthy y activos. |
| Migración Automatizada en Postgres | `docker compose logs api` | Muestra `[Migrations] Migrations completed successfully.` |
| Autenticación Persistente | `POST /api/auth/login` con `admin`/`admin` | Responde HTTP 200 OK y persiste usuario en la tabla `users`. |

---

## 6. Definition of Done (Criterios de Éxito Globales)

1. **Verificación de Sintaxis y Batería de Tests**: `npm run check` y `npm test` deben pasar al 100% en verde.
2. **Levantamiento de Infraestructura**: `docker compose up --build` compila y levanta la solución.
3. **Persistencia y Aislamiento RAG**: Los endpoints de auth y chat operan contra la base de datos PostgreSQL en contenedor y persisten tras `docker compose restart`.
