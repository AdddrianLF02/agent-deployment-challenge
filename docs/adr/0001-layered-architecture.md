# ADR 0001: Adopción de Arquitectura por Capas y Validación de Esquemas

- **Estado**: Aceptado
- **Fecha**: 2026-07-24
- **Candidato Técnico**: Solución para Agent Deployment Challenge

## Contexto

El repositorio base entregaba todas las operaciones del backend (cabeceras de seguridad, validación de mensajes, servicio de estáticos, manejador de chat y captura de errores) dentro de un único archivo `server.mjs` de ~115 líneas. La definición de middlewares inline y la mezcla de responsabilidades limitaban la escalabilidad y mantenibilidad.

## Decisión

Decidimos reestructurar `apps/api/src` en una **Arquitectura por Capas** limpia utilizando módulos nativos de Node.js 22 (`.mjs`), introduciendo una capa dedicada a la orquestación del agente e inspección estricta de esquemas:

- `routes/`: Declaración explícita de rutas HTTP y webhooks.
- `controllers/`: Extracción de peticiones, validación de formato y formateo de respuestas HTTP.
- `services/`: Lógica de negocio e integración con APIs externas (OpenAI).
- `agents/`: **Capa dedicada a la Orquestación del Agente.** Encapsula el motor de razonamiento del LLM, prompts y ejecución controlada de herramientas (*tools*).
- `repositories/`: Acceso a la base de datos PostgreSQL y consultas vectoriales de búsqueda semántica.
- `middlewares/`: Cabeceras de seguridad, verificación de cookies JWT y validación.
- `schemas/`: **Capa de Validación de Esquemas en Runtime**. Adoptamos validación estricta usando **Zod** para auditar cada payload de usuario y cada salida estructurada propuesta por el agente.

## Consecuencias

### Positivas
- **Alta separación de responsabilidades**: Divide el código en módulos independientes y testeables.
- **Seguridad en la ejecución de Tools del LLM**: Validar cada invocación propuesta por el modelo reduce fallos en tiempo de ejecución.
- **Desarrollo ágil**: Mantener `.mjs` evita la sobrecarga de compilación de TypeScript en una prueba con plazo ajustado, mientras Zod aporta la seguridad estructural necesaria.

### Negativas
- Incrementa ligeramente el número de archivos, requiriendo una estructura de carpetas clara.
