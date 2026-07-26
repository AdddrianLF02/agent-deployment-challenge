# Spec 006: Despliegue con Docker y Docker Compose - Plan de Tareas SDD

## Plan de Ejecución por Oleadas (Waves)

---

### Oleada 1: Configuración de Infraestructura e Imágenes Aisladas

#### Tarea 1.1: Creación del Contexto de Exclusión `.dockerignore`
- **Rol**: DevOps / Infrastructure Engineer.
- **Tarea**: Crear el archivo `.dockerignore` en la raíz del repositorio especificando la exclusión de artefactos locales, dependencias instaladas, directorios de construcciones estáticas y archivos de configuración sensibles (`node_modules/`, `.git/`, `.gemini/`, `apps/web/dist/`, `coverage/`, `.env`).
- **Restricciones**: Mantener concordancia con las reglas de `.gitignore`.
- **Éxito**: Presencia del archivo `.dockerignore` en la raíz del workspace excluyendo `node_modules` y `.git`.

#### Tarea 1.2: Definición del Build Multi-Stage `Dockerfile`
- **Rol**: Docker & Package Specialist.
- **Tarea**: Crear `Dockerfile` en la raíz con arquitectura multi-stage basada en `node:22-alpine`:
  - Stage 1 (`web-builder`): Instala dependencias y compila los assets del frontend en `apps/web/dist`.
  - Stage 2 (`runner`): Entorno de producción (`NODE_ENV=production`), instala únicamente dependencias de producción, copia la API y copia los assets estáticos desde `web-builder` a `apps/web/dist`. Expone el puerto `4319` y define `CMD ["npm", "start"]`.
- **Restricciones**: Utilizar la imagen oficial ligera `node:22-alpine`.
- **Éxito**: Archivo `Dockerfile` sintácticamente válido para Docker build.

#### Tarea 1.3: Orquestación IaC con `docker-compose.yml`
- **Rol**: Cloud Systems & Infrastructure Architect.
- **Tarea**: Crear `docker-compose.yml` orquestando dos servicios:
  - `db`: Basado en `pgvector/pgvector:pg16`, mapeando puerto `5432:5432`, definiendo variables `POSTGRES_DB=agent_platform`, `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`, volumen persistente `pgdata` y healthcheck con `pg_isready`.
  - `api`: Construido desde la raíz (`.`), exponiendo puerto `4319:4319`, configurando variables de conexión PostgreSQL (`PGHOST=db`, `PGPORT=5432`, `PGDATABASE=agent_platform`, `PGUSER=postgres`, `PGPASSWORD=postgres`, `PORT=4319`, `HOST=0.0.0.0`) y con dependencia de salud `depends_on: db (condition: service_healthy)`.
- **Restricciones**: Incluir declaración explícita de volumen `pgdata`.
- **Éxito**: Archivo `docker-compose.yml` válido y bien estructurado.

---

### Oleada 2: Refactorización Quirúrgica de Inicialización

#### Tarea 2.1: Inicialización Explícita del Pool en `apps/api/src/server.mjs`
- **Rol**: Backend Systems Engineer.
- **Tarea**: Importar `getPool` desde `./repositories/db.mjs` en `apps/api/src/server.mjs` e invocar `getPool(config)` en `startServer()` antes de ejecutar `runMigrations(config)`.
- **Restricciones**: Modificación quirúrgica sin alterar la firma ni exportaciones de `createApp` o `startServer`.
- **Éxito**: `getPool(config)` se ejecuta precedentemente a `runMigrations(config)` en la secuencia de arranque.

---

### Oleada 3: Verificación Completa y QA de Despliegue

#### Tarea 3.1: Ejecución de Test Suite y Verificación de Sintaxis
- **Rol**: Quality Assurance Specialist.
- **Tarea**: Ejecutar `npm run check` y `npm test` en el proyecto para asegurar que las modificaciones quirúrgicas y adiciones de archivos no rompan ningún contrato previo.
- **Éxito**: 100% de los tests en verde (59 tests pasados) y compilación exitosa.

#### Tarea 3.2: Validación de Despliegue en Contenedores
- **Rol**: DevOps Lead.
- **Tarea**: Validar la compilación e integración de los contenedores Docker mediante `docker compose up --build` o validación estática de composición.
- **Éxito**: Infraestructura lista para despliegue en entornos VPS y desarrollo local.
