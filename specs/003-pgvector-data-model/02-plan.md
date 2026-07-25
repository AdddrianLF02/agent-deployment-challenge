# Spec 003: Modelaje de Datos y Persistencia PostgreSQL + pgvector (Backend)

## Fase 2: Diseño Técnico (Technical Plan)

---

### 1. Esquema DDL Estricto & Migraciones Idempotentes (UUID Native)

La gestión del esquema se ejecutará de forma idempotente mediante el módulo `migrations.mjs` en el arranque del servidor API, utilizando identificadores UUID nativos (`gen_random_uuid()`).

```sql
-- Extensiones requeridas para Vectores y UUIDs
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla 1: Usuarios (UUID Primary Key)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: Conversaciones (UUID Primary Key & Foreign Key)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 3: Mensajes (UUID Primary Key & Foreign Key con Vector de Embeddings 1536-dim)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice Vectorial HNSW para búsqueda ANN rápida por coseno
CREATE INDEX IF NOT EXISTS idx_messages_embedding_hnsw 
ON messages USING hnsw (embedding vector_cosine_ops);

-- Índices Relacionales para Aislamiento por Inquilino (Tenant Isolation)
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
```

---

### 2. Gestión de Conexiones (`db.mjs` & `migrations.mjs`)

#### Arquitectura del Pool de Conexiones (`db.mjs`)
* **Instanciación y Resiliencia**:
  - `db.mjs` crea una instancia singleton de `pg.Pool` utilizando la configuración exportada en `config.mjs` (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`).
  - Implementa un flag de estado `isDatabaseConnected` (inicialmente `false`).
  - Al arrancar la API, ejecuta una prueba de conexión (`pool.query('SELECT 1')`). Si la prueba tiene éxito, `isDatabaseConnected = true`. Si falla (o no hay credenciales), registra un aviso estructurado `[requestId: "system-db"]` y conmuta la API a **Modo In-Memory**.

* **Helper `query(text, params)`**:
  - Encapsula todas las ejecuciones SQL defensivamente.
  - Si `isDatabaseConnected === false`, aborta inmediatamente devolviendo los datos desde el estado In-Memory o notificando la desconexión.
  - Si `isDatabaseConnected === true`, ejecuta `pool.query(text, params)` capturando excepciones relacionales y transformándolas en `DatabaseError`.

* **Método `closePool()`**:
  - Permite cerrar el pool de conexiones de forma limpia durante la finalización del proceso Node.js o durante el desmantelamiento de suites de prueba.

#### Módulo de Migraciones (`migrations.mjs`)
* `runMigrations()`:
  - Invoca la ejecución secuencial del script DDL (creación de extensiones `vector`, `uuid-ossp`, tablas `users`, `conversations`, `messages` e índices HNSW).
  - La ejecución usa sentencias `IF NOT EXISTS`, garantizando idempotencia completa en cada reinicio.

---

### 3. Firmas de Módulos & Repositorios (`src/repositories/`)

Todas las entidades y parámetros utilizan tipos `string` (UUID) para identificadores únicos.

#### A. User Repository (`user.repository.mjs`)
```javascript
/**
 * Crea un nuevo usuario en persistencia.
 * @param {Object} userData
 * @param {string} userData.username
 * @param {string} userData.passwordHash
 * @returns {Promise<{ id: string, username: string, password_hash: string, created_at: Date }>}
 */
export async function createUser({ username, passwordHash }) {}

/**
 * Busca un usuario por su nombre de usuario.
 * @param {string} username
 * @returns {Promise<{ id: string, username: string, password_hash: string, created_at: Date }|null>}
 */
export async function findByUsername(username) {}

/**
 * Busca un usuario por su UUID id.
 * @param {string} id - UUID string
 * @returns {Promise<{ id: string, username: string, password_hash: string, created_at: Date }|null>}
 */
export async function findById(id) {}
```

#### B. Conversation Repository (`conversation.repository.mjs`)
```javascript
/**
 * Crea una nueva conversación asociada a un usuario.
 * @param {Object} convData
 * @param {string} convData.userId - UUID string del usuario propietario
 * @param {string} convData.title
 * @returns {Promise<{ id: string, user_id: string, title: string, created_at: Date, updated_at: Date }>}
 */
export async function createConversation({ userId, title }) {}

/**
 * Obtiene todas las conversaciones asociadas a un UUID de usuario.
 * @param {string} userId - UUID string
 * @returns {Promise<Array<{ id: string, user_id: string, title: string, created_at: Date, updated_at: Date }>>}
 */
export async function findByUserId(userId) {}

/**
 * Busca una conversación por su UUID id.
 * @param {string} id - UUID string
 * @returns {Promise<{ id: string, user_id: string, title: string, created_at: Date, updated_at: Date }|null>}
 */
export async function findById(id) {}

/**
 * Elimina una conversación por ID verificando propiedad de inquilino.
 * @param {string} id - UUID de la conversación
 * @param {string} userId - UUID del usuario solicitante
 * @returns {Promise<boolean>} True si fue eliminada exitosamente
 */
export async function deleteById(id, userId) {}
```

#### C. Message Repository (`message.repository.mjs`)
```javascript
/**
 * Crea y persiste un mensaje dentro de una conversación.
 * @param {Object} msgData
 * @param {string} msgData.conversationId - UUID de la conversación
 * @param {string} msgData.role - 'user' | 'assistant'
 * @param {string} msgData.content
 * @param {Array<number>|null} msgData.embedding - Vector de 1536 dimensiones
 * @returns {Promise<{ id: string, conversation_id: string, role: string, content: string, embedding: Array<number>|null, created_at: Date }>}
 */
export async function createMessage({ conversationId, role, content, embedding = null }) {}

/**
 * Recupera todos los mensajes de una conversación ordenados por fecha de creación.
 * @param {string} conversationId - UUID de la conversación
 * @returns {Promise<Array<{ id: string, conversation_id: string, role: string, content: string, created_at: Date }>>}
 */
export async function findByConversationId(conversationId) {}

/**
 * Búsqueda por Similitud Vectorial RAG aislada estrictamente por usuario (Tenant Isolated Similarity Search)
 * @param {string} userId - UUID del usuario para aislamiento de inquilino
 * @param {Array<number>} queryEmbedding - Vector de 1536 dimensiones del prompt
 * @param {number} topK - Máximo de resultados a retornar (por defecto 5)
 * @param {number} minSimilarity - Umbral de similitud de coseno (por defecto 0.60)
 * @returns {Promise<Array<{ id: string, content: string, similarity: number, conversation_id: string, created_at: Date }>>}
 */
export async function findSimilarMessages(userId, queryEmbedding, topK = 5, minSimilarity = 0.60) {}
```

---

### 4. Estrategia In-Memory (Test Fallback & Generación de UUIDs)

Para asegurar que la suite de pruebas (`npm test`) y entornos desconectados funcionen de forma determinista y sin dependencias externas:

1. **Conmutación Transparente**:
   - Cada repositorio exporta una implementación de doble interfaz (Database Query / In-Memory State).
   - Cuando `isDatabaseConnected === false` o `NODE_ENV === "test"`, todas las invocaciones a los repositorios operan sobre estructuras en memoria RAM (`Map` y `Array`).

2. **Generación de UUIDs en Modo In-Memory**:
   - Para mantener coherencia de tipos con PostgreSQL, la generación de IDs en el fallback en memoria utiliza la API nativa de Node.js `crypto.randomUUID()`.

3. **Estructura de Datos In-Memory**:
   - `usersStore`: `Map<string, User>` (clave `id` en formato UUID).
   - `conversationsStore`: `Map<string, Conversation>` (clave `id` en formato UUID).
   - `messagesStore`: `Array<Message>` (cada mensaje con `id` en formato UUID y `conversation_id` referenciando una conversación existente).

4. **Algoritmo de Similitud Vectorial en JS (`message.repository.mjs`)**:
   - Al ejecutar `findSimilarMessages(userId, queryEmbedding, topK, minSimilarity)` en modo In-Memory:
     1. Filtra los mensajes cuyas conversaciones pertenezcan exclusivamente a `userId` (Tenant Isolation).
     2. Filtra aquellos mensajes que contengan un `embedding` de 1536 dimensiones válido.
     3. Calcula la Similitud de Coseno utilizando producto escalar y magnitudes vectoriales:
        $$\text{cosineSimilarity}(A, B) = \frac{\sum_{i=1}^{1536} A_i \cdot B_i}{\sqrt{\sum_{i=1}^{1536} A_i^2} \cdot \sqrt{\sum_{i=1}^{1536} B_i^2}}$$
     4. Descarta resultados con similitud inferior a `minSimilarity` (0.60).
     5. Ordena los resultados por similitud descendente y devuelve los primeros `topK` (5).

---

### 5. Verificación & Criterios de Éxito

1. **Integridad DDL**: Tipos `UUID` en llaves primarias (`PRIMARY KEY DEFAULT gen_random_uuid()`) y llaves foráneas (`user_id UUID`, `conversation_id UUID`).
2. **Cero Rompimiento de Tests**: `npm test` ejecuta el 100% de los tests HTTP/integración usando el Fallback In-Memory con UUIDs.
3. **Respeto Absoluto a la Línea Roja**: Se mantienen estrictamente las 3 entidades (`users`, `conversations`, `messages`) sin adición de tablas o columnas auxiliares.
