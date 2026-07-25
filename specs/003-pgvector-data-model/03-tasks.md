# Spec 003: Plan de Tareas SDD - Modelaje de Datos y Persistencia PostgreSQL + pgvector (Backend)

## Plan de Ejecución por Oleadas (Waves)

---

### Oleada 1: Fundaciones e Infraestructura

#### Tarea 1.1: Instalación de Dependencias de Persistencia (`package.json`)
- **Rol**: Database Infrastructure Developer.
- **Tarea**: Modificar `apps/api/package.json` para añadir la dependencia de producción `pg` (`^8.11.3`).
- **Restricciones**: No modificar scripts existentes ni alterar el tipo de módulos ES (`"type": "module"`). No incluir dependencias pesadas no autorizadas.
- **Éxito**: Ejecutar `npm install` e importar el módulo mediante `node -e "import('pg');"`.

#### Tarea 1.2: Extensión de la Configuración de Persistencia (`config.mjs`)
- **Rol**: Backend Configuration Developer.
- **Tarea**: Modificar `apps/api/src/config.mjs` para incorporar y validar la clave `postgres` (`host`, `port`, `database`, `user`, `password`) en el retorno de `loadConfig(env)`.
- **Restricciones**: Proveer valores por defecto seguros para entorno local. Retornar configuración limpia sin exponer contraseñas en logs.
- **Éxito**: Ejecutar `node --check apps/api/src/config.mjs` y actualizar `apps/api/test/config.test.mjs` verificando la carga correcta del objeto `config.postgres`.

#### Tarea 1.3: Gestor de Conexiones y Pool (`db.mjs`)
- **Rol**: Database Architect.
- **Tarea**: Crear `apps/api/src/repositories/db.mjs` exportando `getPool(config)`, `isDatabaseConnected()`, `query(text, params)` y `closePool()`.
- **Restricciones**: Si `NODE_ENV === "test"` o la conexión inicial con PostgreSQL falla, establecer `isDatabaseConnected = false` de forma transparente sin provocar fallos en el proceso Node.js.
- **Éxito**: Crear `apps/api/test/repositories/db.test.mjs` verificando en patrón AAA que `isDatabaseConnected()` devuelve `false` en entornos de test sin base de datos y no lanza excepciones descontroladas. Ejecutar `node --test apps/api/test/repositories/db.test.mjs` en verde.

#### Tarea 1.4: Script Idempotente de Migraciones DDL (`migrations.mjs`)
- **Rol**: Database Migration Engineer.
- **Tarea**: Crear `apps/api/src/repositories/migrations.mjs` exportando `runMigrations(config)` para ejecutar el DDL con extensiones `vector`, `uuid-ossp`, tablas `users`, `conversations`, `messages` e índices HNSW.
- **Restricciones**: Todas las sentencias SQL deben ser idempotentes (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). Si la base de datos no está conectada, omitir pacíficamente registrando un log informativo.
- **Éxito**: Crear `apps/api/test/repositories/migrations.test.mjs` comprobando la ejecución idéntica o el bypass transparente en modo fallback via `node --test apps/api/test/repositories/migrations.test.mjs` en verde.

---

### Oleada 2: Repositorios Base

#### Tarea 2.1: Repositorio de Usuarios (`user.repository.mjs`)
- **Rol**: Persistence Developer.
- **Tarea**: Crear `apps/api/src/repositories/user.repository.mjs` exportando `createUser({ username, passwordHash })`, `findByUsername(username)` y `findById(id)`.
- **Restricciones**: Todos los IDs deben ser identificadores UUID `string` (`crypto.randomUUID()` en el fallback In-Memory). Retornar entidades con la estructura de la tabla DDL.
- **Éxito**: Crear `apps/api/test/repositories/user.repository.test.mjs` en patrón AAA usando `node:test`. Verificar creación y consultas en el fallback In-Memory mediante `node --test apps/api/test/repositories/user.repository.test.mjs` en verde.

#### Tarea 2.2: Repositorio de Conversaciones (`conversation.repository.mjs`)
- **Rol**: Persistence Developer.
- **Tarea**: Crear `apps/api/src/repositories/conversation.repository.mjs` exportando `createConversation({ userId, title })`, `findByUserId(userId)`, `findById(id)` y `deleteById(id, userId)`.
- **Restricciones**: Todos los identificadores son UUID strings. Garantizar que `deleteById` requiera y filtre por `userId` para mantener aislamiento de inquilino.
- **Éxito**: Crear `apps/api/test/repositories/conversation.repository.test.mjs` validando la asociación limpia de conversaciones al UUID de usuario ejecutando `node --test apps/api/test/repositories/conversation.repository.test.mjs` en verde.

---

### Oleada 3: Repositorio Vectorial y RAG

#### Tarea 3.1: Repositorio Vectorial de Mensajes (`message.repository.mjs`)
- **Rol**: RAG & Vector Storage Specialist.
- **Tarea**: Crear `apps/api/src/repositories/message.repository.mjs` exportando `createMessage({ conversationId, role, content, embedding })`, `findByConversationId(conversationId)` y `findSimilarMessages(userId, queryEmbedding, topK, minSimilarity)`.
- **Restricciones**: 
  - En PostgreSQL: Usar el operador de similitud de coseno `<=>` con el índice HNSW y filtrar explícitamente por `userId` en la cláusula JOIN.
  - En Fallback In-Memory: Implementar el cálculo matemático de similitud de coseno sobre arreglos de 1536 dimensiones en JavaScript, filtrando los mensajes que pertenezcan al `userId` antes de evaluar el umbral `minSimilarity` (0.60).
- **Éxito**: Crear `apps/api/test/repositories/message.repository.test.mjs` validando la recuperación semántica RAG con vectores simulados y confirmando que no hay fugas de contexto entre usuarios distintos (Tenant Isolation). Ejecutar `node --test apps/api/test/repositories/message.repository.test.mjs` en verde.

---

### Oleada 4: Refactorización y Ensamblado

#### Tarea 4.1: Conexión de Persistencia en Servicio de Autenticación (`auth.service.mjs`)
- **Rol**: Backend Domain Integrator.
- **Tarea**: Modificar `apps/api/src/services/auth.service.mjs` para integrar `user.repository.mjs`, reemplazando credenciales volátiles/estáticas por usuarios persistidos.
- **Restricciones**: Si el usuario administrador no existe en la base de datos o en memoria al validar credenciales, crearlo automáticamente.
- **Éxito**: Ejecutar `node --test apps/api/test/services/auth.service.test.mjs` y confirmar que todos los unitarios de autenticación sigan pasando en verde.

#### Tarea 4.2: Inicialización de Migraciones en el Arranque (`server.mjs`)
- **Rol**: System Integration Engineer.
- **Tarea**: Modificar `apps/api/src/server.mjs` para ejecutar `await runMigrations(config)` durante el proceso de inicio del servidor API.
- **Restricciones**: Envolver la llamada en un bloque defensivo `try/catch` para que la falta de base de datos no detenga el arranque de la API en producción o entorno local.
- **Éxito**: Ejecutar `node --check apps/api/src/server.mjs` verificando el arranque sin excepciones.

#### Tarea 4.3: Suite de Pruebas Global y Verificación de la Solución (`npm run check`)
- **Rol**: Quality Assurance & Release Engineer.
- **Tarea**: Ejecutar la verificación integral de sintaxis, pruebas unitarias y de integración de la API para garantizar un nivel de cobertura impecable sin romper ningún test existente.
- **Restricciones**: Todos los tests en `apps/api/test/` deben ejecutarse y pasar al 100% en verde.
- **Éxito**: Ejecutar `npm run check` y comprobar que la suite completa finaliza exitosamente.
