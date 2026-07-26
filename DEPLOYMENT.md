# Agent Deployment Challenge - Documentación de Despliegue

## Arquitectura y Estrategia de Despliegue

Dadas las características *stateless* del contenedor Node.js y la necesidad de una base de datos con capacidad vectorial (`pgvector`), se ha optado por una estrategia de despliegue en plataforma **PaaS (Platform as a Service)** utilizando **Render**, en lugar de aprovisionar infraestructura en bruto en una VPS.

Esta decisión permite delegar el balanceo de carga, la gestión de certificados SSL y el pipeline de CI/CD, enfocándonos puramente en la lógica del Agente.

### 1. Despliegue del Backend/Frontend (Node.js)
El repositorio cuenta con un `Dockerfile` optimizado (Multi-stage) en la raíz que se encarga de:
1. Instalar dependencias puras.
2. Hacer el build de la aplicación de React (`npm run build`).
3. Levantar el servidor Express unificado, sirviendo tanto la API REST como los estáticos compilados de React en el mismo puerto.

**Configuración en Render:**
- **Origen:** Conexión directa con la rama `main` del repositorio en GitHub.
- **Entorno:** Se inyectan las variables sensibles (Secretos) de forma nativa en la plataforma (sección Environment), asegurando su encriptación:
  - `MODEL_API_KEY`: Credencial de OpenAI.
  - `JWT_SECRET`: Semilla criptográfica para la firma de sesiones seguras HTTP-Only.
  - `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`: Credenciales de la base de datos provisionada.
- Como comprobamos localmente con Docker, el contenedor es capaz de absorber de forma segura y correcta las variables de entorno inyectadas.

### 2. Base de Datos (Memoria RAG)
El núcleo de la "memoria a largo plazo" del agente reside en PostgreSQL con la extensión `pgvector`.
- En lugar de mantener bases de datos complejas aisladas (Pinecone, ChromaDB), usamos el addon nativo de PostgreSQL soportado por Render. 
- Al desplegar, el motor ejecuta automáticamente las migraciones (gracias al paso `[Migrations] Running migrations...` integrado en el arranque del `server.mjs`), creando las tablas de usuarios, conversaciones, e índices vectoriales HNSW.

### 3. Aislamiento y Seguridad (Tenant Isolation)
El entorno desplegado es completamente seguro y multi-tenant:
- **Autenticación:** Las peticiones `/api/chat` requieren una cookie de sesión JWT válida.
- **Aislamiento Vectorial:** Las consultas a `pgvector` incluyen el filtro estricto `WHERE user_id = $1`. Si un usuario consulta al Agente, la similitud de cosenos se calcula *únicamente* sobre el clúster de embeddings de sus propias sesiones históricas, impidiendo filtraciones de memoria entre clientes.
