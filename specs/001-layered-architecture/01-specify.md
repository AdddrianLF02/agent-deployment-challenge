# Spec: Refactorización a Arquitectura por Capas

## Fase 1: Requisitos 

**Impact Report (Radiografía Inicial)**
El sistema actual tiene el enrutamiento y la lógica fuertemente acoplados en el archivo de entrada. Se deben mantener completamente intactos los módulos `config.mjs`, `messages.mjs` y `model-client.mjs`. El objetivo es reorganizar estructuralmente el código sin alterar el comportamiento de la API.

**Criterios de Aceptación (Notación EARS)**

* **Mientras** el servidor esté activo, **cuando** reciba una petición GET en `/api/health`, **el sistema debe** responder con status 200 OK y la estructura `{ status: "ok", model: ... }`.

* **Cuando** se ejecute el comando `npm start`, **el sistema debe** levantar el servidor unificado usando el nuevo esquema de rutas.

* **Cuando** se ejecuten los comandos `npm run check` o `npm run build`, **el sistema debe** generar la compilación en `apps/web/dist` sin lanzar errores de sintaxis o importación.
