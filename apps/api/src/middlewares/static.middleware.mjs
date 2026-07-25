import fs from "node:fs";
import path from "node:path";
import express from "express";

export function registerStaticMiddleware(app, staticPath) {
  if (fs.existsSync(staticPath)) {
    app.use(express.static(staticPath, { index: false }));
    app.use((request, response, next) => {
      if (request.method !== "GET" || request.path.startsWith("/api/")) {
        return next();
      }
      return response.sendFile(path.join(staticPath, "index.html"));
    });
  }
}
