# syntax=docker/dockerfile:1.6
# ─────────────────────────────────────────────────────────────────────
# irno-platform — production image for Career Web (Next.js 16)
#
# Uses `output: 'standalone'` (set in next.config.ts) so the final image
# is ~150 MB instead of ~700 MB.
#
# Build context MUST be the repo root:
#   docker build -f apps/career-web/Dockerfile -t irno-career-web:latest .
#
# IMPORTANT: NEXT_PUBLIC_* values are baked at build time.
# Re-build the image when public URLs change.
# ─────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=22-alpine

# ── 1) deps ─────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /repo

# Copy workspace manifests only — layer cached on source code changes.
# Include all app and package manifests so pnpm can resolve the full
# workspace graph without needing the actual source files.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/career-web/package.json     apps/career-web/package.json
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
COPY packages/auth-client/package.json    packages/auth-client/package.json
COPY packages/meetino-shared/package.json packages/meetino-shared/package.json

RUN pnpm install --frozen-lockfile

# ── 2) build ────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS build
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /repo

# NEXT_PUBLIC_* vars are baked into the JS bundle at build time.
# Pass them via --build-arg when running docker build.
ARG NEXT_PUBLIC_HUB_WEB_URL
ARG NEXT_PUBLIC_CAREER_WEB_URL
ENV NEXT_PUBLIC_HUB_WEB_URL=$NEXT_PUBLIC_HUB_WEB_URL \
    NEXT_PUBLIC_CAREER_WEB_URL=$NEXT_PUBLIC_CAREER_WEB_URL \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /repo /repo
COPY . .

# Build shared packages that career-web depends on.
# @irno/theme, @irno/config, @irno/auth-client have no build step —
# they are consumed as TypeScript source by Next.js directly.
RUN pnpm --filter @irno/types build
RUN pnpm --filter @irno/i18n build
RUN pnpm --filter @irno/utils build

RUN pnpm --filter @irno/career-web build

# ── 3) runtime ──────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runtime
RUN apk add --no-cache libc6-compat tini && \
    addgroup -S irno && adduser -S irno -G irno
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3002 \
    HOSTNAME=0.0.0.0

# Copy the standalone output — contains the server, node_modules, and
# all Next.js internal files needed at runtime.
COPY --from=build --chown=irno:irno /repo/apps/career-web/.next/standalone ./

# Copy static assets (JS chunks, CSS) separately — not included in standalone.
COPY --from=build --chown=irno:irno /repo/apps/career-web/.next/static \
    ./apps/career-web/.next/static

# career-web has no public/ directory, so no public asset copy needed.

USER irno

EXPOSE 3002

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/career-web/server.js"]
