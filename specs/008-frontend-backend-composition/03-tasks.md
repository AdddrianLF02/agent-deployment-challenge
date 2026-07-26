# Spec 008 - Fase 3: Desglose de Tareas Atómicas (`03-tasks.md`)

## Plan de Ejecución por Oleadas Secuenciales (Waves)

---

### Oleada 1: Endpoint de Historial de Chat en Backend

#### Tarea 1.1: Consulta SQL de Historial por Usuario en Repositorio
- **Rol**: Senior Backend Engineer
- **Tarea**: Extender `apps/api/src/repositories/message.repository.mjs` implementando la función exportada `findMessagesByUserId({ userId, limit = 100 })`. Realizar la consulta SQL realizando un `JOIN` entre `messages m` y `conversations c`, solicitando explícitamente `m.role, m.content, m.created_at` (excluyendo la columna `embedding`) e inyectando `WHERE c.user_id = $1 ORDER BY m.created_at ASC LIMIT $2`.
- **Restricciones**:
  - Filtro obligatorio e inquebrantable `WHERE c.user_id = active_user_id` (Tenant Isolation).
  - Exclusión explícita del campo `embedding` (1536 dimensiones) para no penalizar el tamaño del payload HTTP.
  - Fallback in-memory seguro si `pool` es nulo o `NODE_ENV === "test"`.
- **Éxito**: Test unitario/integración en `apps/api/test/repositories/message.repository.test.mjs` donde se devuelvan los mensajes del usuario activo ordenados por fecha ascendente y se confirme la ausencia de la clave `embedding`.

#### Tarea 1.2: Servicio, Controlador, Ruta Protegida `GET /api/chat/history` y Tests
- **Rol**: Lead Backend Developer
- **Tarea**:
  1. Añadir `getChatHistory({ userId })` en `apps/api/src/services/chat.service.mjs`.
  2. Implementar `handleGetHistory(config)` en `apps/api/src/controllers/chat.controller.mjs`.
  3. Exponer `router.get('/history', createAuthMiddleware(config), handleGetHistory(config))` en `apps/api/src/routes/chat.routes.mjs`.
  4. Crear los tests de integración en `apps/api/test/controllers/chat.history.test.mjs`.
- **Restricciones**:
  - Exigir la presencia de `req.user.sub` mediante el middleware de autenticación JWT. Retornar HTTP 401 si no hay sesión.
  - Formato de respuesta JSON estandarizado: `{ ok: true, messages: [...] }`.
- **Éxito**: Test de integración verificando respuesta 401 en peticiones sin cookie y HTTP 200 OK con arreglo de mensajes en peticiones autenticadas.

---

### Oleada 2: Hidratación del Historial en Frontend React

#### Tarea 2.1: Sincronización de Estado en Hook `useChat`
- **Rol**: Senior Frontend Engineer
- **Tarea**: Modificar `apps/web/src/hooks/useChat.js` para incluir los estados `messages` e `isLoadingHistory`. Añadir un efecto `useEffect` que realice la petición `fetch('/api/chat/history', { credentials: 'include' })` cuando `isAuthenticated` sea `true`. Poblar el estado local `messages` con los datos recuperados.
- **Restricciones**:
  - Limpiar el estado de mensajes `setMessages([])` cuando el usuario cierre sesión (`isAuthenticated === false`).
  - Manejo defensivo con `try/catch/finally` para gestionar `isLoadingHistory` sin bloquear la UI si falla la red.
- **Éxito**: Al recargar el navegador estando logueado, la conversación previa conservada en PostgreSQL aparece inmediatamente cargada en la pantalla de chat.

---

### Oleada 3: Renderizado Premium y Seguro de Markdown en UI

#### Tarea 3.1: Instalación de Dependencias e Implementación de Componente `Message`
- **Rol**: UI / UX Frontend Developer
- **Tarea**:
  1. Instalar dependencias en `apps/web`: `react-markdown` (v9+), `rehype-sanitize` (v6+) y `remark-gfm` (v4+).
  2. Actualizar `apps/web/src/components/chat/Message.jsx` implementando:
     - Ramificación de rol: Los mensajes de usuario se renderizan como texto plano escapado por React (`<p className="user-text-content">`).
     - Canalización segura para asistente: Uso de `ReactMarkdown` con `remarkGfm` y `rehypeSanitize` configurado con `customSanitizeSchema` (restringiendo `<script>`, `<iframe>`, `<object>`, sanitizando esquemas `href` y atributos `code`).
     - Interceptor `CodeBlock`: Mapeo del elemento `code` a una estructura visual con encabezado, badge de lenguaje (`code-lang-badge`) y preformato (`code-block-content`), distinguiendo código inline vs en bloque.
     - Interceptor de enlaces `a`: Enlaces con `target="_blank"` y `rel="noopener noreferrer"`.
  3. Crear test unitario en `apps/web/src/components/chat/Message.test.jsx` (o test de componente equivalente).
- **Restricciones**:
  - Cumplir estrictamente la regla **Nivel NEVER contra XSS** (cero llamadas a `dangerouslySetInnerHTML` sin desinfección AST).
  - Cumplir las guías de estética visual del proyecto (diseño limpio, bloques de código legibles, tipografía moderna).
- **Éxito**: Los mensajes del asistente formatean bloques de código, negritas, listas y enlaces con seguridad total y estética premium, superando las pruebas unitarias.

---

### Oleada 4: Verificación y Calidad de Integración

#### Tarea 4.1: Ejecución de Puertas de Calidad y Tests de Regresión
- **Rol**: Full Stack QA Engineer
- **Tarea**: Ejecutar la suite completa de comandos de verificación del repositorio desde la raíz para asegurar cero regresiones.
- **Comandos de Verificación**:
  - `npm run check` (Verificación de sintaxis e importaciones ES Modules / JSX).
  - `npm run build` (Compilación exitosa del bundle en `apps/web/dist`).
  - `npm test` (Pasada completa al 100% de la suite de pruebas automatizadas).
- **Restricciones**: No declarar la especificación o tarea por terminada si alguno de estos comandos falla.
- **Éxito**: Todos los verificadores corren y finalizan en verde sin advertencias ni errores.
