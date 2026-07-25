# AGENTS.md - Project Context & Coding Guidelines

This repository contains the solution for the **Agent Deployment Challenge**. It provides a dockerized, production-ready AI agent platform with authentication, multi-conversation memory using vector embeddings, and a WhatsApp integration skill.

---

## 1. Stack & Architecture

- **Language & Runtime**: JavaScript Node.js 22+ (ES Modules `.mjs` & React `.jsx`).
- **Backend (`apps/api`)**: Express.js in clean layered architecture (see [ADR-0001](file:///C:/proyectos/agent-deployment-challenge/docs/adr/0001-layered-architecture.md)):
  - `routes/`: HTTP endpoint declarations.
  - `controllers/`: Request handling & response formatting.
  - `services/`: Business logic & external service integration.
  - `agents/`: LLM reasoning engine, prompt orchestration & tool manager (see [ADR-0004](file:///C:/proyectos/agent-deployment-challenge/docs/adr/0004-llm-orchestration-with-structured-tool-calling.md)).
  - `repositories/`: PostgreSQL & `pgvector` data access (see [ADR-0003](file:///C:/proyectos/agent-deployment-challenge/docs/adr/0003-pgvector-cross-conversation-memory.md)).
  - `middlewares/`: JWT authentication, security headers & CORS (see [ADR-0002](file:///C:/proyectos/agent-deployment-challenge/docs/adr/0002-jwt-httponly-cookie-auth.md)).
  - `schemas/`: Zod runtime schema validation for payloads and LLM tool outputs.
- **Frontend (`apps/web`)**: React + Vite + Vanilla CSS design system.
- **Database & Memory**: PostgreSQL with `pgvector` extension for vector similarity search across conversations ([ADR-0003](file:///C:/proyectos/agent-deployment-challenge/docs/adr/0003-pgvector-cross-conversation-memory.md)).
- **AI Model Client**: OpenAI API compatible endpoint (`gpt-4o-mini`, `text-embedding-3-small`) ([ADR-0005](file:///C:/proyectos/agent-deployment-challenge/docs/adr/0005-llm-model-selection-and-provider-strategy.md)).
- **Orchestration**: Docker & Docker Compose (`docker-compose.yml`) ([ADR-0006](file:///C:/proyectos/agent-deployment-challenge/docs/adr/0006-docker-compose-deployment.md)).

---

## 2. Workspace Structure

```text
.
├── apps/
│   ├── api/                     # Express API & Agent Backend (JavaScript ES Modules)
│   │   └── src/
│   │       ├── agents/          # LLM orchestration, prompts & tool execution
│   │       ├── config.mjs       # Environment configuration & validation
│   │       ├── controllers/     # Route handlers (auth, chat, whatsapp)
│   │       ├── middlewares/     # Auth (JWT), security headers, error handling
│   │       ├── repositories/    # Postgres & pgvector data access
│   │       ├── routes/          # API & Webhook route declarations
│   │       ├── schemas/         # Zod runtime schemas for payloads & tools
│   │       ├── services/        # OpenAI client, RAG memory & auth logic
│   │       └── server.mjs       # Clean entry point
│   └── web/                     # React Frontend (JavaScript JSX)
│       └── src/
│           ├── components/      # UI components (Chat, Auth, Status)
│           ├── App.jsx          # Main layout & state
│           └── styles.css       # Design tokens & styling
├── docs/
│   └── adr/                     # Architectural Decision Records (ADRs)
├── skills/
│   └── whatsapp-integration/    # WhatsApp integration skill & spec
├── docker-compose.yml           # Local & VPS container orchestration (ADR-0006)
├── Dockerfile                   # Multi-stage production build
└── AGENTS.md                    # Project guidelines for AI Coding Agents
```

---

## 3. Development Commands

Always maintain compatibility with these core scripts from the project root:

- `npm run dev`: Run API and Web in development mode.
- `npm run check`: Run syntax & code verification.
- `npm run build`: Build production bundles for Web and API.
- `npm start`: Start the unified production server on `PORT`.

---

## 4. Operational Guardrails & Quantitative Limits

1. **Payload & Message Constraints**:
   - HTTP request body limit: **64 KB** (`express.json({ limit: "64kb" })`).
   - Maximum messages per chat request: **30 messages** (`MAX_MESSAGES = 30`).
   - Message character length bound: **1 to 8,000 characters** (`MAX_MESSAGE_LENGTH = 8000`).
2. **LLM Request & Timeout Limits**:
   - LLM request timeout: **60,000 ms** (`MODEL_REQUEST_TIMEOUT_MS = 60000`).
   - Allowed chat roles: Strictly `user` and `assistant` (`system` is reserved for backend orchestration).
3. **RAG Vector Search Bounds**:
   - Semantic retrieval limit: **Top K = 5** most relevant message embeddings.
   - Cosine similarity threshold: **Similitude >= 0.60**.
4. **Prompt Injection & Structural Isolation**:
   - System prompts must enclose retrieved RAG history and user inputs inside XML tags (`<user_input>` and `<historical_context>`).
5. **No Breaking Changes**:
   - Preserve existing env configuration keys (`MODEL_API_BASE_URL`, `MODEL_NAME`, `MODEL_API_KEY`, `PORT`, `HOST`).
   - Preserve public endpoints (`GET /api/health`, `POST /api/chat`).

---

## 5. Code Quality & Clean Code Best Practices

1. **Single Responsibility Principle (SRP)**:
   - Each module, controller, or service must have one well-defined purpose.
   - Keep functions concise (under 50 lines) and files focused (under 250 lines).
2. **Defensive Error Handling & Observability**:
   - Never swallow exceptions silently or return empty/fallback responses without logging.
   - Include request context (`[requestId]`) in all server log messages.
   - Use custom error classes (`ModelRequestError`, `AuthError`) for explicit HTTP status code mapping.
3. **Declarative Code & Immutability**:
   - Prefer `const` over `let`. Avoid `var`.
   - Use immutable array patterns (`map`, `filter`, `reduce`) instead of stateful `for` loops where appropriate.
   - Do not mutate function arguments or global module state.
4. **Explicit Naming & JSDoc Annotations**:
   - Use descriptive `camelCase` for variables/functions, `PascalCase` for React components/classes, and `UPPER_SNAKE_CASE` for constants.
   - Provide JSDoc annotations for exported functions in `services/` and `repositories/` to ensure clear interface contracts.
5. **No Hardcoded Magic Numbers or Credentials**:
   - Extract numeric limits, timeouts, and URLs into `config.mjs` or named constants.
   - Environment variables must be validated upon application startup.

---

## 6. Quality Gates & Definition of Done (Verification Guardrails)

Before declaring any feature complete, the following empirical verifications MUST pass:

1. **Type Checking & Syntax Gate**: `npm run check` passes without syntax or import errors.
2. **Production Bundle Gate**: `npm run build` generates valid outputs in `apps/web/dist`.
3. **Container Orchestration Gate**: `docker-compose up --build` successfully launches API, Web, and Postgres with `pgvector`.
4. **Security & Auth Gate**: Unauthenticated requests to `/api/chat` return HTTP 401 Unauthorized.
5. **Cross-Session RAG Memory Gate**: Sending a prompt in Session A enriches the response of a separate Session B using retrieved vector context.

---

## 7. Testing (General Rules)

1. **Framework & Runtime**: `node:test` (built-in Node.js 22+). No external testing dependencies.
2. **Location**: `apps/api/test/` with subdirectories mirroring `src/` (e.g., `test/middlewares/`, `test/controllers/`, `test/services/`).
3. **Script**: `npm test` runs `node --test` automatically discovering `*.test.mjs` files.
4. **AAA Pattern**: Every test must strictly follow the Arrange, Act, Assert structure. Use `// Arrange`, `// Act`, `// Assert` comments to visually separate each block.
5. **Object Mother Pattern**: Do not instantiate complex test objects directly in the test. Use the Object Mother pattern (e.g., `ConfigMother.withModel()`, `ExpressMother.createMockRes()`) importing it from `test/factories/`.
6. **Isolation**: Unit tests must not depend on the network, database, or filesystem. Use injected mocks/stubs via parameters.

---

## 8. Git & GitHub Flow

1. **Atomic Commits**: One commit per delegated atomic task.
2. **Commit Format**: Conventional Commits is mandatory:
   - `feat(scope):` New functionality.
   - `fix(scope):` Bug fix.
   - `test(scope):` New or modified tests.
   - `refactor(scope):` Structural change without behavior change.
   - `chore(scope):` Maintenance tasks (deps, config, CI).
   - `docs(scope):` Documentation.
3. **Pull Requests**: Every PR must include:
   - Description in Delta format of the Spec (ADDED, MODIFIED, REMOVED).
   - Confirmation that `npm run check` and `npm test` pass successfully.

