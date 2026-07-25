# Spec 004: Plan de Arquitectura y Componentización Frontend

## Plan de Ejecución y Arquitectura de Componentes

### 1. Estructura de Archivos
```text
apps/web/src/
├── components/
│   ├── auth/
│   │   ├── AuthLayout.jsx
│   │   └── LoginForm.jsx
│   └── shared/
│       ├── Button.jsx
│       └── Input.jsx
├── App.jsx
└── styles.css
```

### 2. Estrategia de Estilos
- Implementación de Design Tokens en `:root` (colores, sombras, efectos de cristal/glassmorphism, fuentes).
- Componentes puros estilizados a través de clases CSS dedicadas sin librerías de UI externas.
