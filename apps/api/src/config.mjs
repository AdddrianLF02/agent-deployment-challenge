const DEFAULT_PORT = 4319;
const DEFAULT_TIMEOUT_MS = 60_000;

function parsePositiveInteger(value, fallback, name) {
  if (value === undefined || value === "") return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

export function loadConfig(env = process.env) {
  const modelBaseUrl = env.MODEL_API_BASE_URL?.trim() ?? "";
  const modelName = env.MODEL_NAME?.trim() ?? "";

  if (modelBaseUrl) {
    try {
      new URL(modelBaseUrl);
    } catch {
      throw new Error("MODEL_API_BASE_URL must be a valid URL");
    }
  }

  return {
    host: env.HOST?.trim() || "0.0.0.0",
    port: parsePositiveInteger(env.PORT, DEFAULT_PORT, "PORT"),
    auth: {
      adminUsername: env.ADMIN_USERNAME?.trim() || "admin",
      adminPassword: env.ADMIN_PASSWORD?.trim() || "admin",
      jwtSecret: env.JWT_SECRET?.trim() || "default_jwt_secret_for_local_development_only",
      tokenMaxAgeSeconds: parsePositiveInteger(
        env.JWT_TOKEN_MAX_AGE_SECONDS,
        86400,
        "JWT_TOKEN_MAX_AGE_SECONDS"
      ),
    },
    model: {
      apiKey: env.MODEL_API_KEY?.trim() ?? "",
      baseUrl: modelBaseUrl.replace(/\/$/, ""),
      name: modelName,
      systemPrompt:
        env.MODEL_SYSTEM_PROMPT?.trim() ||
        "You are a helpful assistant. Be clear, concise, and honest.",
      timeoutMs: parsePositiveInteger(
        env.MODEL_REQUEST_TIMEOUT_MS,
        DEFAULT_TIMEOUT_MS,
        "MODEL_REQUEST_TIMEOUT_MS",
      ),
    },
    postgres: {
      host: env.PGHOST?.trim() || "localhost",
      port: parsePositiveInteger(env.PGPORT, 5432, "PGPORT"),
      database: env.PGDATABASE?.trim() || "agent_platform",
      user: env.PGUSER?.trim() || "postgres",
      password: env.PGPASSWORD?.trim() || "postgres",
    },
    modelConfigured: Boolean(modelBaseUrl && modelName),
  };
}
