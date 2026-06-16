# syntax=docker/dockerfile:1.6
# ─────────────────────────────────────────────────────────────────────
# irno-platform — production image for Meetino web (Next.js)
#
# Uses `output: 'standalone'` (set in next.config.mjs) so the final
# image is ~150 MB instead of ~700 MB.
#
# Build context MUST be the repo root:
#   docker build -f apps/meetino-web/Dockerfile -t irno-meetino-web:latest .
#
# IMPORTANT: NEXT_PUBLIC_* values are baked at build time.
# Re-build the image when API/LiveKit URLs change.
# ─────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=20-alpine

# ── 1) deps ─────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
RUN corepack enable && apk add --no-cache libc6-compat
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
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /repo

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_LIVEKIT_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_APP_NAME=Meetino
ARG NEXT_PUBLIC_IRNO_SSO_ENABLED=false
ARG NEXT_PUBLIC_IRNO_HUB_WEB_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_IRNO_SSO_ENABLED=$NEXT_PUBLIC_IRNO_SSO_ENABLED \
    NEXT_PUBLIC_IRNO_HUB_WEB_URL=$NEXT_PUBLIC_IRNO_HUB_WEB_URL \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /repo /repo
COPY . .

# Build Meetino shared package first
RUN pnpm --filter @irno/meetino-shared build

# Standalone Next.js build
RUN pnpm --filter @irno/meetino-web build

# ── 3) runtime ──────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runtime
RUN apk add --no-cache libc6-compat tini && \
    addgroup -S meetino && adduser -S meetino -G meetino
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=build --chown=meetino:meetino /repo/apps/meetino-web/.next/standalone ./
COPY --from=build --chown=meetino:meetino /repo/apps/meetino-web/.next/static    ./apps/meetino-web/.next/static
COPY --from=build --chown=meetino:meetino /repo/apps/meetino-web/public          ./apps/meetino-web/public

USER meetino

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/meetino-web/server.js"]
