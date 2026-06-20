# syntax=docker/dockerfile:1.6
# ─────────────────────────────────────────────────────────────────────
# irno-platform — production image for Meetino API (NestJS)
#
# Multi-stage so the final runtime image only carries the compiled JS,
# the Prisma engine binaries, and runtime deps.
#
# Build context MUST be the repo root:
#   docker build -f apps/meetino-api/Dockerfile -t irno-meetino-api:latest .
# ─────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=20-alpine

# ── 1) deps ─────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
RUN corepack enable && apk add --no-cache libc6-compat openssl
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/hub-web/package.json        apps/hub-web/package.json
COPY apps/hub-api/package.json        apps/hub-api/package.json
COPY apps/meetino-web/package.json    apps/meetino-web/package.json
COPY apps/meetino-api/package.json    apps/meetino-api/package.json
COPY packages/types/package.json          packages/types/package.json
COPY packages/validators/package.json     packages/validators/package.json
COPY packages/i18n/package.json           packages/i18n/package.json
COPY packages/theme/package.json          packages/theme/package.json
COPY packages/utils/package.json          packages/utils/package.json
COPY packages/config/package.json         packages/config/package.json
COPY packages/meetino-shared/package.json packages/meetino-shared/package.json

RUN pnpm install --frozen-lockfile

# ── 2) build ────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS build
RUN corepack enable && apk add --no-cache libc6-compat openssl
WORKDIR /repo

COPY --from=deps /repo /repo
COPY . .

# Build @irno/meetino-shared (Meetino-specific types/enums)
RUN pnpm --filter @irno/meetino-shared build

# Generate Prisma client inside the image (alpine binary match).
# DATABASE_URL must be syntactically valid for Prisma to initialise its
# config reader, but the value is never used — schema introspection is
# skipped during generate.  The real URL is injected at container runtime
# by Docker Compose and never baked into any image layer.
RUN DATABASE_URL='postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public' \
    pnpm --filter @irno/meetino-api exec prisma generate --schema=src/prisma/schema.prisma

# Compile the API
RUN pnpm --filter @irno/meetino-api build

# Re-install production-only deps (drops TS, nest-cli, etc.)
RUN pnpm --filter @irno/meetino-api... install --prod --frozen-lockfile

# ── 3) runtime ──────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runtime
RUN apk add --no-cache libc6-compat openssl tini && \
    addgroup -S meetino && adduser -S meetino -G meetino
WORKDIR /app

ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn

COPY --from=build --chown=meetino:meetino /repo/node_modules                  ./node_modules
COPY --from=build --chown=meetino:meetino /repo/packages/meetino-shared       ./packages/meetino-shared
COPY --from=build --chown=meetino:meetino /repo/apps/meetino-api/dist         ./apps/meetino-api/dist
COPY --from=build --chown=meetino:meetino /repo/apps/meetino-api/node_modules ./apps/meetino-api/node_modules
COPY --from=build --chown=meetino:meetino /repo/apps/meetino-api/package.json ./apps/meetino-api/package.json
COPY --from=build --chown=meetino:meetino /repo/apps/meetino-api/src/prisma   ./apps/meetino-api/src/prisma
COPY --from=build --chown=meetino:meetino /repo/apps/meetino-api/scripts      ./apps/meetino-api/scripts

USER meetino
WORKDIR /app/apps/meetino-api

# Storage directory for file uploads
RUN mkdir -p /app/apps/meetino-api/storage/meeting-files

EXPOSE 4001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
