# Spec 005: Plan de Tareas SDD - Frontend Core State

## Plan de Ejecución por Oleadas (Waves)

---

### Oleada 1: Capa Agnóstica y Limpieza

#### Tarea 1.1: Cliente API Central (`utils/api.js`)
- **Rol**: Frontend Network Engineer.
- **Tarea**: Extraer la lógica cruda de peticiones HTTP hacia un cliente estandarizado en `apps/web/src/utils/api.js`. Esta utilidad debe procesar automáticamente cabeceras como `Content-Type: application/json` y resolver limpiamente tanto los payloads exitosos como las aserciones de error.
- **Éxito**: El módulo no tiene dependencias de React, compila exitosamente y encapsula uniformemente el uso nativo de `fetch`.

#### Tarea 1.2: Purga Definitiva de Falsa Persistencia
- **Rol**: Data Flow Developer.
- **Tarea**: Escanear `App.jsx` y destruir todas las funciones, lecturas y escrituras asociadas a `localStorage` (como `STORAGE_KEY` y `loadStoredMessages`). 
- **Éxito**: Búsqueda del string `localStorage` dentro de `apps/web/src` devuelve 0 coincidencias.

---

### Oleada 2: Hooks de Dominio (Capa React)

#### Tarea 2.1: Orquestador de Autenticación (`hooks/useAuth.js`)
- **Rol**: Frontend Security Engineer.
- **Tarea**: Migrar las variables de estado `isAuthenticated` y `health`, junto con los handlers `handleLogin` y `checkHealth`, hacia un Custom Hook. Internamente debe utilizar el nuevo cliente de `api.js` para despachar el inicio de sesión contra el backend.
- **Éxito**: La interfaz devuelve un objeto estricto: `{ isAuthenticated, health, login, checkHealth }`.

#### Tarea 2.2: Ciclo de Vida del Chat (`hooks/useChat.js`)
- **Rol**: React State Architect.
- **Tarea**: Extraer a un hook propio los estados transitorios de la conversación (`messages`, `draft`, `sending`, `error`) y el despachador de mensajes. El estado de los mensajes debe inicializarse como un arreglo efímero en memoria (`[]`).
- **Éxito**: Exposición de la API: `{ messages, draft, setDraft, sending, error, sendMessage, clearMessages }`.

---

### Oleada 3: Refactorización Final del Orquestador

#### Tarea 3.1: Ensamblado y Delegación en `App.jsx`
- **Rol**: Frontend Integrator.
- **Tarea**: Limpiar el cuerpo principal de `App.jsx`, reemplazando decenas de líneas de código imperativo con las inicializaciones de nuestros dos hooks (`useAuth` y `useChat`). Luego, derivar las funciones como parámetros (props) hacia los componentes renderizados.
- **Éxito**: `App.jsx` actúa exclusivamente como coordinador. La suite compila perfectamente al ejecutar `npm run build` en el entorno de desarrollo.
