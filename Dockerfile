# Stage 1: Build Frontend Web
FROM node:22-alpine AS web-builder
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci
COPY apps/web ./apps/web
RUN npm run build --workspace=apps/web

# Stage 2: Runtime Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci --omit=dev
COPY apps/api ./apps/api
COPY --from=web-builder /app/apps/web/dist ./apps/web/dist

EXPOSE 4319
CMD ["npm", "start"]
