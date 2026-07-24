# ADR 0003: PostgreSQL + pgvector para Memoria RAG Multiconversación

- **Estado**: Aceptado
- **Fecha**: 2026-07-24
- **Candidato Técnico**: Solución para Agent Deployment Challenge

## Contexto

El reto exige que el agente pueda consultar y relacionar información obtenida en conversaciones diferentes (capacidad multiconversación). Para lograrlo, el agente debe ir más allá del historial de sesión a corto plazo (**Memoria Episódica**) e implementar un sistema de **Memoria Semántica** a largo plazo. Una petición iniciada en la Sesión A debe poder enriquecerse con información recopilada en la Sesión B sin desbordar la ventana de contexto del LLM.

## Decisión

Elegimos **PostgreSQL** con la extensión **`pgvector`** y embeddings vectoriales de OpenAI (`text-embedding-3-small` / 1536 dimensiones) para construir una arquitectura RAG (Retrieval-Augmented Generation):

1. **Almacenamiento e Indexación Vectorial**: Cada mensaje de usuario y respuesta del agente se convierte a un vector de embeddings y se guarda junto a metadatos relacionales (`user_id`, `conversation_id`).
2. **Aislamiento de Datos de Usuario**: Las búsquedas vectoriales se filtran estrictamente por `user_id` antes del cálculo de similitud.
3. **Búsqueda ANN con Índice HNSW**: Utilizamos el índice **HNSW** (Hierarchical Navigable Small World) sobre `IVFFlat` para búsquedas de similitud de coseno (`embedding <=> query_vector`) ultra rápidas.
4. **Inyección Contextual Top-K**: Limitamos la recuperación a las 5 coincidencias más relevantes (`top_k=5`) con una similitud de coseno superior a `0.6`, inyectándolas en el prompt del sistema (`systemPrompt`).

## Alternativas Consideradas

- **Almacenamiento Local / Memoria RAM**: No persiste tras reinicios y no escala.
- **Pinecone / Base de Datos Vectorial Externa**: Introduce costes adicionales y dependencia de APIs de terceros.
- **SQLite con `sqlite-vec`**: Evaluado. Descartado porque PostgreSQL con `pgvector` ofrece un ecosistema más robusto y preparado para producción con índices HNSW de alto rendimiento.

## Consecuencias

### Positivas
- **Búsqueda Semántica de Nivel de Producción**: Infraestructura PostgreSQL totalmente auto-hospedada.
- **Privacidad e Integridad de Datos**: Los metadatos relacionales garantizan el aislamiento estricto entre usuarios.
- **Optimización de la Ventana de Contexto**: La limitación `Top-K` evita sobrecargar el prompt, manteniendo latencias bajas y costes de tokens predecibles.

### Negativas
- Requiere un contenedor PostgreSQL con la extensión `pgvector` habilitada en el entorno de despliegue.
