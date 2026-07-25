# Spec 004: Plan de Tareas SDD - Componentización e Interfaz de Usuario UI

## Plan de Ejecución por Oleadas (Waves)

---

### Oleada 1: Fundaciones de Diseño y Componentes Base

#### Tarea 1.1: Configuración del Sistema de Tokens y Tipografía (`styles.css` e `index.html`)
- **Rol**: Frontend UI Architect.
- **Tarea**: Importar la fuente 'Inter' en `index.html` y redefinir `styles.css` con variables CSS en `:root` para colores de modo oscuro, bordes, sombras y Glassmorphism.
- **Éxito**: Compilación sin errores y verificación visual del fondo base.

#### Tarea 1.2: Creación de Componentes Atómicos Reutilizables (`Button.jsx`, `Input.jsx`)
- **Rol**: Component Developer.
- **Tarea**: Crear `apps/web/src/components/shared/Input.jsx` y `Button.jsx` con estilos nativos y estados interactivos (`:hover`, `:focus`).
- **Éxito**: Componentes aislados sin errores de compilación React.

---

### Oleada 2: Módulo de Autenticación (Auth UI)

#### Tarea 2.1: Envoltorio y Formulario de Autenticación (`AuthLayout.jsx`, `LoginForm.jsx`)
- **Rol**: Frontend Feature Developer.
- **Tarea**: Crear `apps/web/src/components/auth/AuthLayout.jsx` y `LoginForm.jsx` manejando los campos de usuario, contraseña, errores y callback de envío.
- **Éxito**: Formulario renderizado de manera limpia e integrada.

#### Tarea 2.2: Refactorización y Ensamblado de `App.jsx`
- **Rol**: Frontend Integrator.
- **Tarea**: Refactorizar `App.jsx` para remover el marcado HTML nativo de login e integrar el nuevo `LoginForm`.
- **Éxito**: `npm run build` genera la build de producción en `apps/web/dist` sin errores.

---

### Oleada 3: Componentización de la Consola de Agente (Chat UI)

#### Tarea 3.1: Extracción de Componentes de Presentación (`Message.jsx`, `ModelStatus.jsx`, `EmptyState.jsx`)
- **Rol**: UI Component Developer.
- **Tarea**: Extraer las funciones `Message`, `ModelStatus`, y `EmptyState` desde el monolito `App.jsx` a archivos separados dentro de `apps/web/src/components/chat/`.
- **Éxito**: Los componentes son importados correctamente en `App.jsx` sin romper el diseño ni la lógica existente.

#### Tarea 3.2: Extracción del Panel de Composición (`Composer.jsx` o `ChatInput.jsx`)
- **Rol**: UI Component Developer.
- **Tarea**: Extraer el formulario `.composer` (el textarea y el botón de enviar) a un componente `Composer.jsx`, delegando el estado `draft`, `sending` y el evento de submit a través de props.
- **Éxito**: El input envía mensajes correctamente tras la refactorización.

---

### Oleada 4: Orquestación, Estado y Redirección (Core App)

#### Tarea 4.1: Refactorización del Estado Global (`App.jsx` como Enrutador/Controlador)
- **Rol**: Frontend Architect.
- **Tarea**: Consolidar el estado de autenticación (acceso), redirección condicional (Login vs Workspace) y manejo de errores globales en `App.jsx`. Limpiar las funciones auxiliares (como `loadStoredMessages` y `readJson`) moviéndolas a un archivo `utils/api.js` o `utils/storage.js`.
- **Éxito**: `App.jsx` queda como un archivo limpio de menos de 100 líneas dedicado exclusivamente a la orquestación del estado, delegando la UI a los componentes.

#### Tarea 4.2: Validación Transaccional (Feedback de Errores UI)
- **Rol**: UX/UI Engineer.
- **Tarea**: Asegurar que los errores de red (e.g. 401 Unauthorized, 500 Server Error) levanten alertas visuales claras en los componentes (usando `auth-error` o un Toast system simple), impidiendo el envío de strings vacíos.
- **Éxito**: Pruebas manuales demuestran que enviar un mensaje vacío está deshabilitado y un error de red no bloquea indefinidamente la app (loading states).
