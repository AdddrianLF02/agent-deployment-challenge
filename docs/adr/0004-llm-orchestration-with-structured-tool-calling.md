# ADR 0004: Orquestación LLM con Tool Calling y Defensa Anti-Prompt Injection

- **Estado**: Aceptado
- **Fecha**: 2026-07-24
- **Candidato Técnico**: Solución para Agent Deployment Challenge

## Contexto

Construir un agente capaz de consultar memoria semántica y ejecutar acciones requiere establecer barreras de seguridad estrictas entre instrucciones del sistema, entradas no confiables del usuario y llamadas a herramientas (*tools*). Permitir que el LLM ejecute acciones basándose en texto plano sin validar introduce riesgos de fiabilidad y vulnerabilidades de **Prompt Injection**.

## Decisión

Adoptamos una estrategia de orquestación estructurada basada en **LLM Tool Calling** con validación en runtime y límites de ejecución estrictos:

1. **Invocación de Herramientas Estructurada**: El LLM interactúa con la aplicación exclusivamente a través de herramientas registradas en el backend, sin interpretar comandos en texto libre.
2. **Validación de Esquemas en Runtime (Zod)**: Cada parámetro propuesto por el LLM se valida contra un esquema Zod antes de su ejecución.
3. **Registro de Herramientas con Privilegio Mínimo**: Solo las herramientas predefinidas pueden ejecutarse. El modelo no puede invocar funciones arbitrarias ni acceder a recursos no expuestos.
4. **Mitigación de Prompt Injection**: Los mensajes de usuario y fragmentos RAG se tratan como datos no confiables y se delimitan explícitamente mediante etiquetas XML (`<user_input>` y `<historical_context>`).
5. **Manejo Determinista de Errores**: La ejecución de tools y la recuperación ante fallos están bajo el control estricto del servidor.

## Alternativas Consideradas

- **Parsing de Lenguaje Natural en Texto Plano**: Descartado. Es frágil, propenso a alucinaciones e imposible de validar con seguridad.
- **Ejecución de Funciones sin Validación de Esquemas**: Descartado. Aumenta el riesgo de ejecutar argumentos malformados o llamadas no autorizadas.

## Consecuencias

### Positivas
- **Ejecución Segura de Tools**: Solo se ejecutan herramientas explícitamente registradas y validadas.
- **Reducción de Riesgos de Prompt Injection**: La separación estricta de contexto aísla las instrucciones del sistema de las entradas del usuario.
- **Mayor Fiabilidad y Tolerancia a Fallos**: La validación con Zod evita caídas por respuestas malformadas del modelo.

### Negativas
- Añade una pequeña sobrecarga de validación en tiempo de ejecución para cada tool propuesta.
