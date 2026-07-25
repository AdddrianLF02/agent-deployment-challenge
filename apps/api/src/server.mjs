import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { loadConfig } from "./config.mjs";
import { securityMiddleware } from "./middlewares/security.middleware.mjs";
import { registerStaticMiddleware } from "./middlewares/static.middleware.mjs";
import { errorHandlerMiddleware, notFoundHandlerMiddleware } from "./middlewares/error.middleware.mjs";
import { createApiRouter } from "./routes/index.mjs";
import { runMigrations } from "./repositories/migrations.mjs";

export function createApp(config = loadConfig()) {
  const app = express();

  app.disable("x-powered-by");
  app.use(securityMiddleware);
  app.use(express.json({ limit: "64kb" }));

  app.use("/api", createApiRouter(config));

  const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
  const webDirectory = path.resolve(sourceDirectory, "../../web/dist");
  registerStaticMiddleware(app, webDirectory);

  app.use(errorHandlerMiddleware);
  app.use(notFoundHandlerMiddleware);

  return app;
}

export async function startServer(config = loadConfig()) {
  try {
    await runMigrations(config);
  } catch (error) {
    console.error("Failed to run database migrations during startup:", error);
  }
  const app = createApp(config);
  return app.listen(config.port, config.host, () => {
    console.log(`Agent challenge listening on http://${config.host}:${config.port}`);
  });
}

const isEntryPoint = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isEntryPoint) await startServer();
