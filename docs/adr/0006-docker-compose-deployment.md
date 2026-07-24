# ADR 0006: Orquestación de Contenedores con Docker y Docker Compose

- **Estado**: Aceptado
- **Fecha**: 2026-07-24
- **Candidato Técnico**: Solución para Agent Deployment Challenge

## Contexto

El reto exige dejar la solución del agente desplegada y accesible en un entorno VPS real listo para ser probado. La configuración manual sobre el sistema operativo host introduce problemas de inconsistencia y riesgos de seguridad, especialmente dado que los agentes interactúan con dependencias y entradas de usuario impredecibles.

## Decisión

Elegimos **Docker y Docker Compose** para la orquestación y despliegue del entorno:

- **`Dockerfile` Multi-Stage**: Compila los assets de la Web (React/Vite) y de la API en una imagen liviana basada en Node.js 22 alpine, reduciendo la superficie de ataque e imágenes pesadas.
- **`docker-compose.yml`**: Infraestructura como Código (IaC) que define el servicio de la `api` y el servicio de la base de datos `db` (`pgvector/pgvector:pg16`) con volúmenes persistentes y variables de entorno.

## Alternativas Consideradas

- **Aprovisionamiento Manual en VPS (PM2 + Postgres nativo)**: Descartado. Dificulta la reproducibilidad del entorno y carece de aislamiento de procesos.
- **Kubernetes (K8s)**: Descartado. Supone una sobreingeniería excesiva para un despliegue en un único servidor VPS.

## Consecuencias

### Positivas
- **Despliegue con Comando Único**: `docker-compose up --build --detach`.
- **Paridad de Entorno**: Garantiza idéntico comportamiento entre el desarrollo local, pruebas y la VPS de producción.
- **Aislamiento del Agente**: Los contenedores virtualizan la ejecución del agente, protegiendo el sistema operativo host.
- **Enlace Automático de Servicios**: Docker Compose gestiona la red interna y las dependencias (`depends_on: db`) entre la API y la base de datos vectorial.

### Negativas
- Ligero consumo de RAM/CPU asociado al demonio de Docker frente a una ejecución sobre metal sin virtualizar.
