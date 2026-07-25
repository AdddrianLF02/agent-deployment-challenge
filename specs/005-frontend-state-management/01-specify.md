# Spec 005: Manejo de Estado Global y Core Integration (Frontend)

## Fase 1: Requisitos & Análisis de Impacto

### Impact Report (Radiografía Inicial & Formato Delta)

#### Radiografía del Estado Actual
A pesar de la limpieza visual lograda en la Spec 004, `App.jsx` sigue centralizando toda la lógica de negocio del cliente. Ejecuta llamadas HTTP crudas, manipula JSON manualmente y mantiene una falsa persistencia acoplada al `localStorage`. 

#### Radiografía de Cambios Esperados (Formato Delta SDD):
- **[+] ADDED**: `apps/web/src/utils/api.js` (Abstracción estandarizada para cliente HTTP con soporte para cookies HttpOnly).
- **[+] ADDED**: `apps/web/src/hooks/useAuth.js` (Custom Hook para orquestar el login y la comprobación de salud de red).
- **[+] ADDED**: `apps/web/src/hooks/useChat.js` (Custom Hook para el ciclo de vida de los mensajes).
- **[~] MODIFIED**: `apps/web/src/App.jsx` (Reducido a un orquestador puramente declarativo).

---

### Criterios de Aceptación (Notación EARS Conductual)

* **Cuando** cualquier componente necesite comunicarse con el backend, **el sistema debe** utilizar el cliente HTTP centralizado (`api.js`) para garantizar que las cabeceras (incluyendo `credentials: 'include'`) y el manejo de errores se procesen de forma idéntica.
* **Mientras** el usuario envíe mensajes en la interfaz de chat, **el sistema debe** mantener un estado efímero en memoria (vía React State) y abstenerse completamente de escribir en el `localStorage` del navegador.
* **Cuando** una petición retorne un código de error de red (ej. `401 Unauthorized`), **el sistema debe** atraparlo en la capa de utilidades y propagar un error estándar hacia el componente consumidor.

---

### Guardarraíles de Diseño & Calidad

1. **Eliminación de Falsa Persistencia**: Todo uso de `localStorage` debe ser extirpado. La aplicación aceptará ser temporalmente amnésica al recargar, como paso previo a la integración inminente del historial persistido en PostgreSQL (siguiente Spec).
2. **Desacoplamiento de Vista**: Los hooks de dominio (`useAuth`, `useChat`) no deben retornar JSX ni manipular el DOM, limitándose a retornar objetos y funciones transaccionales.
