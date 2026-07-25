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
