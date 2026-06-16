# syntax=docker/dockerfile:1.6
# ─────────────────────────────────────────────────────────────────────
# irno-platform — production image for Hub API (NestJS 11)
#
# Multi-stage: build deps → compile → minimal runtime image.
# Prisma client is generated inside the image (alpine binary match).
#
# Build context MUST be the repo root:
#   docker build -f apps/hub-api/Dockerfile -t irno-hub-api:latest .
# ─────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=22-alpine

# ── 1) deps ─────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
RUN corepack enable && apk add --no-cache libc6-compat openssl
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/hub-web/package.json     apps/hub-web/package.json
COPY apps/hub-api/package.json     apps/hub-api/package.json
COPY apps/meetino-web/package.json apps/meetino-web/package.json
COPY apps/meetino-api/package.json apps/meetino-api/package.json
COPY packages/types/package.json        packages/types/package.json
COPY packages/validators/package.json   packages/validators/package.json
COPY packages/i18n/package.json         packages/i18n/package.json
COPY packages/theme/package.json        packages/theme/package.json
COPY packages/utils/package.json        packages/utils/package.json
COPY packages/config/package.json       packages/config/package.json
COPY packages/meetino-shared/package.json packages/meetino-shared/package.json

RUN pnpm install --frozen-lockfile

# ── 2) build ────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS build
RUN corepack enable && apk add --no-cache libc6-compat openssl
WORKDIR /repo

COPY --from=deps /repo /repo
COPY . .

# Build shared packages hub-api depends on
RUN pnpm --filter @irno/types build
RUN pnpm --filter @irno/validators build
RUN pnpm --filter @irno/config build

# Generate Prisma client inside the image (alpine-matched binary)
RUN pnpm --filter @irno/hub-api db:generate

# Compile NestJS app
RUN pnpm --filter @irno/hub-api build

# Re-install production-only deps (drops TS, nest-cli, etc.)
RUN pnpm --filter @irno/hub-api... install --prod --frozen-lockfile

# ── 3) runtime ──────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runtime
# Playwright/Chromium system dependencies (Alpine packages)
# Required for server-side PDF generation via CareerPdfService
RUN apk add --no-cache \
    libc6-compat openssl tini \
    chromium nss freetype harfbuzz ca-certificates ttf-freefont \
    udev && \
    addgroup -S irno && adduser -S irno -G irno
WORKDIR /app

# Tell Playwright to use the system Chromium instead of downloading its own
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn

# Hub API nest-cli entryFile is apps/hub-api/src/main, rootDir is ../../
# so the compiled output lives at apps/hub-api/dist/apps/hub-api/src/main.js
COPY --from=build --chown=irno:irno /repo/node_modules                  ./node_modules
COPY --from=build --chown=irno:irno /repo/packages                      ./packages
COPY --from=build --chown=irno:irno /repo/apps/hub-api/dist             ./apps/hub-api/dist
COPY --from=build --chown=irno:irno /repo/apps/hub-api/node_modules     ./apps/hub-api/node_modules
COPY --from=build --chown=irno:irno /repo/apps/hub-api/package.json     ./apps/hub-api/package.json
COPY --from=build --chown=irno:irno /repo/apps/hub-api/prisma           ./apps/hub-api/prisma

USER irno
WORKDIR /app/apps/hub-api

EXPOSE 4000

# prisma migrate deploy is run as a separate one-shot init container, not on boot
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/apps/hub-api/src/main.js"]
