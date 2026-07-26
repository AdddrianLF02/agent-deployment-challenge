# Spec 008 - Fase 2: Diseño Técnico (`02-plan.md`)

## 1. Visión General de la Arquitectura

El objetivo del diseño técnico de la **Spec 008** es resolver la desincronización de estado (History Amnesia) entre la base de datos PostgreSQL y la interfaz de usuario en React, además de proveer un renderizado visual estructurado (Markdown y bloques de código) en el componente `Message.jsx`.

---

## 2. Restricciones y Guardarraíles Inquebrantables (Nivel NEVER)

1. **Aislamiento Multi-inquilino y Payload Eficiente**:
   - **Cláusula SQL Obligatoria**: Toda consulta a la tabla `messages` DEBE incluir `WHERE user_id = active_user_id`.
   - **Exclusión de Embeddings**: Prohibido retornar la columna `embedding` (1536 dimensiones) en el endpoint de historial `GET /api/chat/history`. La consulta debe solicitar explícitamente `role`, `content`, `created_at`.
   - **Ordenamiento Cronológico**: Los mensajes deben ordenarse de más antiguo a más reciente (`created_at ASC`) para reconstruir fielmente la conversación.

2. **Seguridad y Desinfección en Frontend (XSS Defense)**:
   - El procesador de Markdown NUNCA debe ejecutar cadenas HTML arbitrarias en React mediante `dangerouslySetInnerHTML` sin desinfección previa o mediante componentes seguros.

3. **Sin Romper Contratos HTTP Preexistentes**:
   - Los endpoints `POST /api/chat`, `POST /api/auth/login`, `POST /api/auth/logout` y `GET /api/auth/me` deben mantener su comportamiento intacto.

---

## 3. Especificación de Componentes y Firmas de Código

### A. Repositorio de Mensajes (`apps/api/src/repositories/message.repository.mjs`)

Extensión de la capa de persistencia para recuperar los mensajes ordenados del usuario activo.

```javascript
/**
 * Recupera el historial de mensajes de la conversación activa de un usuario (excluyendo embeddings).
 * @param {Object} params
 * @param {string} params.userId - ID del usuario autenticado.
 * @param {number} [params.limit=100] - Límite máximo de mensajes.
 * @returns {Promise<Array<{ role: string, content: string, created_at: Date }>>}
 */
export async function findMessagesByUserId({ userId, limit = 100 }) {
  if (!pool) return getInMemoryHistory(userId); // Fallback test / in-memory

  const query = `
    SELECT m.role, m.content, m.created_at
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.user_id = $1
    ORDER BY m.created_at ASC
    LIMIT $2;
  `;
  const result = await pool.query(query, [userId, limit]);
  return result.rows;
}
```

---

### B. Servicio de Chat (`apps/api/src/services/chat.service.mjs`)

Servicio encargado de la lógica de negocio para la recuperación del historial.

```javascript
/**
 * Obtiene el historial formateado para la sesión activa del usuario.
 * @param {Object} params
 * @param {string} params.userId - Identificador único del usuario.
 * @returns {Promise<{ ok: boolean, messages?: Array<Object>, error?: string }>}
 */
export async function getChatHistory({ userId }) {
  if (!userId) {
    return { ok: false, error: "Usuario no identificado" };
  }
  try {
    const messages = await messageRepository.findMessagesByUserId({ userId });
    return { ok: true, messages };
  } catch (error) {
    console.error(`Error recuperando historial para usuario ${userId}:`, error);
    return { ok: false, error: "No se pudo cargar el historial de chat" };
  }
}
```

---

### C. Controlador y Rutas (`apps/api/src/controllers/chat.controller.mjs` & `chat.routes.mjs`)

Inclusión del handler HTTP protegido para la ruta `GET /api/chat/history`.

```javascript
// chat.routes.mjs
export function createChatRouter(config) {
  const router = express.Router();
  const auth = createAuthMiddleware(config);

  router.post('/', auth, handleChat(config));
  router.get('/history', auth, handleGetHistory(config));
  return router;
}

// chat.controller.mjs
export function handleGetHistory(config) {
  return async (request, response) => {
    const userId = request.user?.sub;
    if (!userId) {
      return response.status(401).json({ error: "Unauthorized" });
    }

    const result = await chatServiceModule.getChatHistory({ userId });
    if (!result.ok) {
      return response.status(500).json({ error: result.error });
    }

    return response.json({ ok: true, messages: result.messages });
  };
}
```

---

### D. Hook de React (`apps/web/src/hooks/useChat.js`)

Sincronización de estado local con el backend al inicializar la aplicación.

```javascript
export function useChat({ isAuthenticated }) {
  const [messages, setMessages] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setMessages([]);
      return;
    }

    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const res = await fetch("/api/chat/history", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.messages)) {
            setMessages(data.messages);
          }
        }
      } catch (err) {
        console.error("Error al cargar historial:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadHistory();
  }, [isAuthenticated]);

  // ... lógica existente de sendMessage ...
}
```

---

### E. Renderizado UI Seguro (`apps/web/src/components/chat/Message.jsx`)

El componente `Message.jsx` procesa las respuestas en formato Markdown generadas por los modelos LLM, garantizando un renderizado estético de primera calidad (bloques de código, negritas, listas y elementos inline) bajo una regla inquebrantable de **Nivel NEVER contra vulnerabilidades XSS (Cross-Site Scripting)**.

#### 1. Librerías Seleccionadas e Importaciones Explícitas
Para lograr la desinfección en tiempo de renderizado sin invocar `dangerouslySetInnerHTML`, se empleará `react-markdown` junto con la canalización de plugins de AST y desinfección estricta `rehype-sanitize`:

- **`react-markdown`** (v9+): Parser de Markdown para React basado en AST (`remark` / `rehype`).
- **`rehype-sanitize`** (v6+): Plugin de seguridad para eliminar etiquetas HTML no permitidas (`<script>`, `<iframe>`, handlers inline `onload`, `onerror`, etc.) según el esquema de seguridad de GitHub.
- **`remark-gfm`** (v4+): Soporte para GitHub Flavored Markdown (tablas, listas de verificación, tachado).

#### 2. Código de Renderizado Seguro y Componente `Message.jsx`

```jsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

/**
 * Esquema de sanitización estricto para rehype-sanitize.
 * Hereda del esquema por defecto de GitHub (GHFM) y restringe atributos/esquemas peligrosos.
 */
const customSanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...defaultSchema.tagNames.filter(tag => tag !== 'script' && tag !== 'iframe' && tag !== 'object'),
    'code', 'pre', 'span', 'p', 'b', 'strong', 'i', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'h1', 'h2', 'h3'
  ],
  attributes: {
    ...defaultSchema.attributes,
    code: [['className', /^language-[\w-]+$/]],
    a: ['href', 'target', 'rel']
  },
  protocols: {
    href: ['http', 'https', 'mailto']
  }
};

/**
 * Interceptor de bloques de código (mapeo del elemento <code> a un componente visual estructurado).
 */
function CodeBlock({ node, inline, className, children, ...props }) {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeContent = String(children).replace(/\n$/, '');

  if (inline) {
    return (
      <code className="inline-code" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-lang-badge">{language || 'text'}</span>
      </div>
      <pre className="code-block-content">
        <code className={className} {...props}>
          {codeContent}
        </code>
      </pre>
    </div>
  );
}

/**
 * Componente principal de Mensaje de Chat.
 *
 * @param {Object} props
 * @param {Object} props.message - Objeto de mensaje ({ role: 'user'|'assistant', content: string }).
 */
export function Message({ message }) {
  const isUser = message?.role === 'user';

  return (
    <div className={`message-wrapper ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="message-avatar">
        {isUser ? 'U' : 'AI'}
      </div>
      <div className="message-bubble">
        {isUser ? (
          // El mensaje de usuario se renderiza como texto plano escapado por React
          <p className="user-text-content">{message.content}</p>
        ) : (
          // El mensaje del asistente pasa por la canalización segura de ReactMarkdown + rehypeSanitize
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[[rehypeSanitize, customSanitizeSchema]]}
            components={{
              code: CodeBlock,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="markdown-link">
                  {children}
                </a>
              )
            }}
          >
            {message?.content || ''}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
```

#### 3. Flujo Interno de Desinfección y Protección XSS
1. **Entrada de Markdown**: El contenido `message.content` ingresa al componente `ReactMarkdown`.
2. **Transformación AST (Remark)**: Se convierte el texto plano en un árbol sintáctico abstracto (AST) de Markdown.
3. **Conversión HTML (Rehype)**: El árbol AST de Markdown se convierte en un árbol de nodos HTML.
4. **Filtro de Desinfección (rehype-sanitize)**: `rehype-sanitize` inspecciona cada nodo HTML contra `customSanitizeSchema`. Etiquetas no permitidas (ej. `<script>alert('xss')</script>` o eventos inline `onerror=...`) son purgadas por completo del AST antes de la fase de renderizado.
5. **Mapeo de Componentes de React**: Se invoca el componente `CodeBlock` únicamente para nodos `<code>` limpios y verificados, generando la estructura visual en React sin evaluar scripts.

---

## 4. Matriz de Componentes e Impacto en el Repositorio

| Componente | Ruta del Archivo | Responsabilidad |
| :--- | :--- | :--- |
| **Message Repo** | `apps/api/src/repositories/message.repository.mjs` | Consulta SQL de historial ordenado sin columna embedding. |
| **Chat Service** | `apps/api/src/services/chat.service.mjs` | Lógica de negocio para obtener historial por `userId`. |
| **Chat Controller** | `apps/api/src/controllers/chat.controller.mjs` | Handler HTTP para `GET /api/chat/history`. |
| **Chat Routes** | `apps/api/src/routes/chat.routes.mjs` | Exposición de la nueva ruta GET protegida con `authMiddleware`. |
| **useChat Hook** | `apps/web/src/hooks/useChat.js` | Petición `fetch` de historial al montar con `isAuthenticated`. |
| **Message Component**| `apps/web/src/components/chat/Message.jsx` | Parsing y renderizado enriquecido de sintaxis Markdown. |

---

## 5. Estrategia de Verificación y Cobertura de Pruebas

1. **Test Integración Backend (`chat.history.test.mjs`)**:
   - Petición sin autenticación a `GET /api/chat/history` retorna 401 Unauthorized.
   - Petición autenticada retorna los mensajes guardados ordenados por fecha en orden ascendente y confirma que la propiedad `embedding` no está presente en el JSON.
2. **Test Unitario Frontend (`Message.test.jsx`)**:
   - Verificar que mensajes de texto plano se renderizan correctamente.
   - Verificar que mensajes con bloques de código ` ```javascript ` renderizan la etiqueta de código formateada.
3. **Verificación de Compilación y Sintaxis**:
   - Ejecutar `npm run check` y `npm run build` para garantizar cero errores de construcción.
