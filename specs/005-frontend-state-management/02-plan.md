# Spec 005: Plan de Arquitectura Frontend (Core State)

## Plan de Ejecución y Refactorización

### 1. Estructura de Archivos
Se incorporan directorios dedicados para utilidades (agnósticas a React) y hooks (acoplados a React).

```text
apps/web/src/
├── components/         # (Creados en Spec 004)
├── hooks/
│   ├── useAuth.js      # Maneja lógica de login y comprobación de servicio
│   └── useChat.js      # Maneja el arreglo efímero de mensajes y el POST a la API
├── utils/
│   └── api.js          # Cliente fetch encapsulado (headers de cookie e inyección JSON)
├── App.jsx             # Enrutador visual principal (vaciado de lógica)
└── styles.css
```

### 2. Estrategia de Extracción
1. **Identificar**: Rastrear dónde se utiliza `fetch` y extraerlo a `api.js`.
2. **Purgar**: Eliminar `loadStoredMessages` y los eventos `setItem` vinculados a `STORAGE_KEY`.
3. **Encapsular**: Mover los estados (`useState`) a sus dominios correspondientes (`useAuth` para sesión, `useChat` para conversación).
4. **Inyectar**: Importar los custom hooks en `App.jsx` e inyectar el estado a la interfaz estúpida (dumb components).
