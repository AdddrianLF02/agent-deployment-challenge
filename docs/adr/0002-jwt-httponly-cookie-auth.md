# ADR 0002: Autenticación JWT en Cookies HttpOnly

- **Estado**: Aceptado
- **Fecha**: 2026-07-24
- **Candidato Técnico**: Solución para Agent Deployment Challenge

## Contexto

El reto requiere proteger el acceso a la aplicación mediante un sistema de login. En el contexto de un Agente de IA, la autenticación va más allá del control de acceso básico; es el mecanismo fundamental para lograr la **aislación de datos de usuario (tenant isolation)**, garantizando que la memoria vectorial no mezcle conversaciones entre diferentes sesiones.

## Decisión

Implementamos autenticación mediante **JSON Web Tokens (JWT)** almacenados en **Cookies `HttpOnly`**:
- Las credenciales de administración (`ADMIN_USERNAME` y `ADMIN_PASSWORD`) se configuran de forma segura vía variables de entorno.
- Tras un login exitoso (`POST /api/auth/login`), se emite un JWT firmado que se guarda en una cookie con flags `HttpOnly`, `SameSite=Lax` y `Path=/`.
- Un middleware de autenticación intercepta las rutas protegidas (`/api/chat`), verifica la firma del JWT y extrae la identidad del usuario para aislar las búsquedas en la memoria vectorial.

## Alternativas Consideradas

- **Sesiones en SQLite (`express-session` + `connect-sqlite3`)**: Evaluado. Se descartó porque exige persistir archivos de sesión en volumen y complica la escalabilidad stateless en contenedores Docker.
- **JWT en LocalStorage / SessionStorage**: Descartado. Expone el token a ataques Cross-Site Scripting (XSS) mediante scripts de terceros.

## Consecuencias

### Positivas
- **Protección XSS**: La cookie `HttpOnly` es totalmente inaccesible para el JavaScript del navegador.
- **Seguridad en la Memoria del Agente**: Garantiza un identificador de usuario verificado para aislar las búsquedas RAG.
- **Despliegue Stateless en Docker**: La API no requiere almacenamiento persistente de sesiones en disco para validar peticiones HTTP.

### Negativas
- La revocación instantánea de un JWT requiere listas de bloqueo o definir tiempos de expiración reducidos (24h por defecto).