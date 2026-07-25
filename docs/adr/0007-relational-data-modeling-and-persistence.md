# ADR 0007: Modelaje de Datos Relacional y Gestor de Persistencia

- **Estado**: Aceptado
- **Fecha**: 2026-07-26
- **Candidato Técnico**: Solución para Agent Deployment Challenge

## Contexto

El ADR 0003 documentó la estrategia de almacenamiento vectorial para la memoria RAG (PostgreSQL + pgvector). Sin embargo, era necesario definir con precisión el esquema DDL y el modelaje relacional base (usuarios, conversaciones, mensajes) para garantizar la coherencia de los datos, así como la estrategia del cliente de base de datos a emplear en la aplicación Node.js.

## Decisión

### 1. Gestor de Persistencia (Database Client)
Se opta por utilizar el driver nativo **`pg` (node-postgres)** sin un ORM pesado (como Prisma o TypeORM).
- **Justificación**: Mantiene la ligereza de la API (`apps/api`), reduce las dependencias y permite el control total y directo sobre las sentencias SQL (especialmente necesario para consultas específicas de pgvector y `<=>` que muchos ORMs no soportan de forma natural).
- **Tolerancia a Fallos (Fallback)**: Se ha implementado un gestor de pool (`db.mjs`) que detecta la ausencia de conexión y permite a los repositorios usar un almacenamiento *In-Memory* local. Esto es vital para ejecutar pruebas unitarias (`NODE_ENV === "test"`) sin depender de una base de datos levantada.

### 2. Esquema DDL y Modelaje Relacional
El esquema de datos se normaliza para garantizar un fuerte aislamiento de inquilino (Tenant Isolation):

- **Tabla `users`**:
  - `id` (UUID): Identificador único global (Primary Key).
  - `username` (VARCHAR): Nombre de usuario (Unique). Requerido para el inicio de sesión.
  - `password_hash` (VARCHAR): Contraseña encriptada persistida.
  
- **Tabla `conversations`**:
  - `id` (UUID): Primary Key.
  - `user_id` (UUID): Llave foránea hacia `users(id)` con `ON DELETE CASCADE`.
  - `title` (VARCHAR): Título de la conversación.
  - `status` (VARCHAR): Estado de la conversación (ej. 'active').

- **Tabla `messages`**:
  - `id` (UUID): Primary Key.
  - `conversation_id` (UUID): Llave foránea hacia `conversations(id)` con `ON DELETE CASCADE`.
  - `role` (VARCHAR): Define si el mensaje es de 'user' o 'assistant'.
  - `content` (TEXT): Contenido textual del mensaje.
  - `embedding` (vector(1536)): Representación vectorial, indexada mediante HNSW.

## Alternativas Consideradas

- **ORMs Tradicionales (Sequelize, TypeORM, Prisma)**: Rechazados por el sobrecoste arquitectónico y la complejidad adicional para manipular tipos nativos de `pgvector` e implementar un fallback in-memory transparente sin mockear toda la librería.
- **Almacenamiento No Relacional / MongoDB**: Rechazado, dado que las búsquedas HNSW vectoriales de Postgres ofrecen una de las implementaciones más performantes y nos evitan mantener bases de datos dispares para metadatos y vectores.

## Consecuencias

### Positivas
- **Aislamiento Seguro**: Las consultas RAG siempre requieren un JOIN con `conversations` para filtrar explícitamente por el inquilino autenticado (`user_id`).
- **Simplicidad**: El patrón Repository absorbe la lógica SQL pura con parámetros bindeados (`$1, $2`) garantizando inyección segura.
- **Idempotencia**: Los scripts de migración DDL pueden auto-ejecutarse al arrancar el contenedor sin requerir librerías gestoras de migración pesadas.

### Negativas
- Requiere mantenimiento manual de las sentencias SQL (DDL y DML) dentro de los repositorios.
