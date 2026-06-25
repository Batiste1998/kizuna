# syntax=docker/dockerfile:1

# ─── Build stage : install + build @kizuna/db et @kizuna/api ───
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @kizuna/db build && pnpm --filter @kizuna/api build

# ─── Runtime ───────────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
# Le monorepo installé est conservé (db source + tsx pour les migrations).
COPY --from=build /app ./
EXPOSE 3001
# Applique les migrations puis démarre l'API.
CMD ["sh", "-lc", "pnpm --filter @kizuna/db migrate && node apps/api/dist/main.js"]
