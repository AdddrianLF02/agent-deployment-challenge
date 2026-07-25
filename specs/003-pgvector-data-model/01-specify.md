# Spec 003: Modelaje de Datos y Persistencia PostgreSQL + pgvector (Backend)

## Fase 1: Requisitos & Análisis de Impacto

### Impact Report (Radiografía Inicial & Formato Delta)

#### Radiografía del Estado Actual
Actualmente `apps/api/src/repositories/` es una carpeta vacía que contiene únicamente un archivo `.gitkeep`. La API maneja peticiones de chat y autenticación de forma volátil en memoria HTTP, sin persistir usuarios, conversaciones ni mensajes.

#### Radiografía de Cambios (Formato Delta SDD):
- **[+] ADDED**: `apps/api/src/repositories/db.mjs` (Gestor de conexión y pool a PostgreSQL)
- **[+] ADDED**: `apps/api/src/repositories/migrations.mjs` (Script idempotente de migración y esquema inicial)
- **[+] ADDED**: `apps/api/src/repositories/user.repository.mjs` (Persistencia y consulta de usuarios)
- **[+] ADDED**: `apps/api/src/repositories/conversation.repository.mjs` (Persistencia y consulta de conversaciones por usuario)
- **[+] ADDED**: `apps/api/src/repositories/message.repository.mjs` (Persistencia de mensajes y búsqueda semántica de vectores)
- **[~] MODIFIED**: `apps/api/src/config.mjs` (Parámetros opcionales de conexión a PostgreSQL)
- **[~] MODIFIED**: `apps/api/package.json` (Adición del paquete ligero `pg`)
- **[=] UNTOUCHED**: `apps/api/src/routes/*`
- **[=] UNTOUCHED**: `apps/api/src/controllers/*`
- **[=] UNTOUCHED**: `apps/api/src/middlewares/*`
- **[-] REMOVED**: `apps/api/src/repositories/.gitkeep`

#### Estrategia de Salvaguarda de Pruebas (Test Integrity):
Para garantizar que la suite de pruebas existente (`npm test`, `auth.integration.test.mjs`, `server.test.mjs`) mantenga el 100% de pasadas en verde sin requerir una instancia física de PostgreSQL en entornos CI/CD o pruebas locales desconectadas:
1. **Inyección de Repositorios en Memoria (In-Memory Fallback)**: La capa de repositorios detectará si la base de datos no está configurada o si `NODE_ENV === "test"`, utilizando repositorios mock/in-memory para aislar la suite de pruebas HTTP de la infraestructura física.
2. **Cero Acoplamiento en la Capa HTTP**: Los controladores y middlewares existentes no interactuarán con sintaxis SQL ni dependencias de `pg`, interactuando exclusivamente a través de los contratos abstractos de los repositorios.

---

### Criterios de Aceptación (Notación EARS Conductual)

* **Mientras** el servidor de la API esté en ejecución, **cuando** el sistema inicie la capa de persistencia, **el sistema debe** verificar de forma idempotente que las estructuras relacionales y la capacidad de almacenamiento de vectores semánticos estén listas antes de aceptar peticiones.

* **Cuando** un usuario autenticado inicie una nueva sesión de chat o envíe un mensaje, **el sistema debe** asociar la conversación y sus mensajes única y exclusivamente a la identidad del usuario activo.

* **Mientras** un usuario mantenga conversaciones registradas en el sistema, **cuando** el agente procese una nueva petición para generar una respuesta, **el sistema debe** aislar el historial del usuario activo para garantizar que la memoria y las búsquedas semánticas no mezclen información con conversaciones de otros usuarios.

* **Mientras** existan mensajes procesados en el historial de un usuario, **cuando** el agente consulte información contextual previa de conversaciones anteriores del mismo usuario, **el sistema debe** recuperar únicamente las coincidencias con mayor relevancia semántica que superen el umbral mínimo de similitud configurado.

* **Cuando** ocurra una interrupción temporal en el servicio de persistencia o en la generación de vectores semánticos, **el sistema debe** registrar el fallo de forma defensiva y permitir la continuidad del flujo sin provocar el cierre o caída descontrolada de la API.

---

### Guardarraíles de Negocio & Privacidad

1. **Garantía de Aislamiento de Inquilinos (Tenant Isolation)**: Bajo ningún concepto se permitirá que la memoria o búsquedas de un usuario A sean visibles o influyan en las respuestas generadas para un usuario B.
2. **Persistencia Transaccional e Integridad de Dominio**: Toda conversación creada debe pertenecer a un usuario válido existente. Si la conversación se elimina, todos sus mensajes asociados deben eliminarse en cascada.
