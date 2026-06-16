# syntax=docker/dockerfile:1.6
# ─────────────────────────────────────────────────────────────────────
# irno-platform — production image for Hub web (Next.js 16)
#
# Uses `output: 'standalone'` (set in next.config.ts) so the final image
# is ~150 MB instead of ~700 MB.
#
# Build context MUST be the repo root:
#   docker build -f apps/hub-web/Dockerfile -t irno-hub-web:latest .
#
# IMPORTANT: NEXT_PUBLIC_* values are baked at build time.
# Re-build the image when API URLs change.
# ─────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=22-alpine

# ── 1) deps ─────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /repo

# Copy workspace manifests only — layer cached on code changes
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
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /repo

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /repo /repo
COPY . .

# Build shared packages that hub-web depends on
RUN pnpm --filter @irno/types build
RUN pnpm --filter @irno/validators build
RUN pnpm --filter @irno/i18n build
RUN pnpm --filter @irno/theme build
RUN pnpm --filter @irno/utils build
RUN pnpm --filter @irno/config build

RUN pnpm --filter @irno/hub-web build

# ── 3) runtime ──────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runtime
RUN apk add --no-cache libc6-compat tini && \
    addgroup -S irno && adduser -S irno -G irno
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=build --chown=irno:irno /repo/apps/hub-web/.next/standalone ./
COPY --from=build --chown=irno:irno /repo/apps/hub-web/.next/static    ./apps/hub-web/.next/static
COPY --from=build --chown=irno:irno /repo/apps/hub-web/public          ./apps/hub-web/public

USER irno

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/hub-web/server.js"]
