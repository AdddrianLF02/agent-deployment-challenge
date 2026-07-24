# ADR 0005: Selección de Modelo LLM y Estrategia de Proveedor

- **Estado**: Aceptado
- **Fecha**: 2026-07-24
- **Candidato Técnico**: Solución para Agent Deployment Challenge

## Contexto

El reto requiere conectar la aplicación del agente con un modelo de IA a elección libre, justificando la decisión técnica y la estrategia de despliegue.

## Decisión

Elegimos un modelo y proveedor basado en la interfaz compatible **OpenAI Chat Completions** con **`gpt-4o-mini`** (o pasarelas compatibles en OpenRouter/Ollama):

1. **Compatibilidad con Protocolo OpenAI Chat Completions**:
   - La API interactúa mediante endpoints estándar `/chat/completions` y `/embeddings`.
   - Mantiene total compatibilidad con las variables de entorno existentes (`MODEL_API_BASE_URL`, `MODEL_NAME`, `MODEL_API_KEY`).

2. **Elección del Modelo (`gpt-4o-mini`)**:
   - Proporciona capacidad de razonamiento cercana a GPT-4 con latencia reducida (~300ms) y coste optimizado por token.
   - Soporte nativo para salidas estructuradas en JSON y seguimiento de instrucciones en prompts.

3. **Modelo de Embeddings (`text-embedding-3-small`)**:
   - Genera vectores de 1536 dimensiones optimizados para la búsqueda por similitud de coseno en `pgvector`.

## Alternativas Consideradas

- **Ejecutar Modelo Local en VPS (Ollama / Llama-3-8B)**: Evaluado. Se descartó debido al elevado consumo de RAM/VRAM en servidores VPS y latencias de inferencia de 5 a 15 segundos por turno, mientras que las APIs cloud mantienen respuestas sub-segundo.

## Consecuencias

### Positivas
- Inferencia rápida y eficiente con respuestas por debajo del segundo.
- Configuración flexible que permite cambiar de proveedor (OpenRouter, Groq, Ollama) modificando únicamente el archivo `.env`.

### Negativas
- Requiere una clave API activa o un gateway proxy compatible con cuota disponible.
