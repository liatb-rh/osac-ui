# Multi-stage build: one image runs the BFF + serves the SPA bundle
# Usage:
#   podman build -t osac:latest -f Containerfile .
#   podman run --rm -p 8080:8080 -e OSAC_API_MODE=mock osac:latest

# ── Stage 1: install workspace dependencies ────────────────────────────────
FROM registry.access.redhat.com/ubi9/nodejs-22-minimal:9.8 AS deps
USER root
WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY libs/api-contracts/package.json ./libs/api-contracts/
COPY libs/ui-components/package.json ./libs/ui-components/
COPY apps/app-backend/package.json ./apps/app-backend/
COPY apps/app-frontend/package.json ./apps/app-frontend/

RUN pnpm install --frozen-lockfile

# ── Stage 2: build SPA ────────────────────────────────────────────────────
FROM deps AS spa-builder
WORKDIR /app

COPY libs/ ./libs/
COPY apps/app-frontend/ ./apps/app-frontend/

# Build frontend (output goes to apps/app-backend/public per vite.config.ts)
RUN pnpm --filter @osac/app-frontend run build

# ── Stage 3: build BFF ────────────────────────────────────────────────────
FROM deps AS bff-builder
WORKDIR /app

COPY libs/ ./libs/
COPY apps/app-backend/ ./apps/app-backend/
COPY --from=spa-builder /app/apps/app-backend/public ./apps/app-backend/public

# Compile shared lib first so pnpm deploy picks up JS output, not raw TS
RUN pnpm --filter @osac/api-contracts run build

# Transpile TypeScript → dist/
RUN pnpm --filter @osac/app-backend run build

# Create a self-contained deployment bundle with all production deps resolved
RUN pnpm deploy --filter @osac/app-backend --prod /deploy

# ── Stage 4: production image ──────────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/nodejs-22-minimal:9.8 AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV OSAC_API_MODE=mock
ENV LOG_LEVEL=info

COPY --from=bff-builder /app/apps/app-backend/dist ./dist
COPY --from=bff-builder /app/apps/app-backend/public ./public
COPY --from=bff-builder /deploy/node_modules ./node_modules

EXPOSE 8080
USER 1001

CMD ["node", "dist/index.js"]
