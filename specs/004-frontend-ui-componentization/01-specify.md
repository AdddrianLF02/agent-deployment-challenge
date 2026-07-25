# Spec 004: Refactorización y Componentización de UI (Login & Design System)

## Fase 1: Requisitos & Análisis de Impacto

### Impact Report (Radiografía Inicial & Formato Delta)

#### Radiografía del Estado Actual
Actualmente `apps/web/src/` contiene una implementación monolítica donde `App.jsx` concentra todo el estado y la vista, junto con un `styles.css` sin sistema de tokens estructurado ni diseño moderno adaptado a los estándares premium.

#### Radiografía de Cambios (Formato Delta SDD):
- **[+] ADDED**: `apps/web/src/components/shared/Button.jsx` (Componente de botón reutilizable)
- **[+] ADDED**: `apps/web/src/components/shared/Input.jsx` (Componente de campo de texto reutilizable)
- **[+] ADDED**: `apps/web/src/components/auth/AuthLayout.jsx` (Envoltorio estilizado para vistas de autenticación)
- **[+] ADDED**: `apps/web/src/components/auth/LoginForm.jsx` (Formulario de login segregado)
- **[~] MODIFIED**: `apps/web/src/styles.css` (Sistema de Tokens de Diseño, CSS Variables y utilidades de Glassmorphism)
- **[~] MODIFIED**: `apps/web/src/App.jsx` (Refactorización para usar componentes modularizados)
- **[~] MODIFIED**: `apps/web/index.html` (Inclusión de tipografía moderna como Inter)

---

### Criterios de Aceptación (Notación EARS Conductual)

* **Mientras** el usuario no se encuentre autenticado, **cuando** cargue la aplicación web, **el sistema debe** presentar una interfaz de autenticación limpia, centrada y estilizada con efecto Glassmorphism y campos interactivos.

* **Cuando** el usuario envíe el formulario con sus credenciales, **el sistema debe** manejar los estados de carga y error visualmente de forma clara antes de delegar la autenticación a la API.

---

### Guardarraíles de Diseño & Calidad

1. **Aislamiento y Reutilización**: Los componentes compartidos (`Button`, `Input`) no deben contener lógica de dominio específica.
2. **Vanilla CSS & Tokens**: Todo el estilizado debe emplear únicamente CSS nativo con variables Custom Properties (`:root`).
