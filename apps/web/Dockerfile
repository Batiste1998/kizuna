# syntax=docker/dockerfile:1

# ─── Build stage : build @kizuna/db puis le front (sortie Nitro) ───
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
# VITE_API_URL est inliné dans le bundle client → fourni au build.
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @kizuna/db build \
  && pnpm --filter @kizuna/shared build \
  && pnpm --filter @kizuna/web build

# ─── Runtime : serveur Nitro autonome (.output) ────────────────
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
