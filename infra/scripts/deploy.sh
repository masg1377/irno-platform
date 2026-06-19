#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Irno Platform — Routine Deployment
#
# Safe order for every deployment after the first:
#   1. Build updated Docker images
#   2. Run database migrations (hub-api + meetino-api)
#   3. Rolling restart of application containers
#
# ⛔  This script NEVER seeds the database.
#     Use first-deploy.sh for the initial admin account (run once only).
#
# ⛔  This script NEVER runs:
#       prisma migrate dev   — generates new migrations (dev only)
#       prisma migrate reset — drops all data
#       prisma db push       — bypasses migration history
#
# Usage:
#   git pull origin main
#   ./infra/scripts/deploy.sh
#
# Required:
#   infra/docker/.env.prod          — production env file
#   infra/docker/docker-compose.prod.yml
#
# NEXT_PUBLIC_* build args:
#   Next.js bakes NEXT_PUBLIC_* vars into the JS bundle at build time.
#   Override the defaults below by setting them in your shell before running:
#     export NEXT_PUBLIC_HUB_WEB_URL=https://hub.example.com
#     ./infra/scripts/deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

COMPOSE_FILE="${REPO_ROOT}/infra/docker/docker-compose.prod.yml"
ENV_FILE="${REPO_ROOT}/infra/docker/.env.prod"

COMPOSE="docker compose --env-file ${ENV_FILE} -f ${COMPOSE_FILE}"

log()  { echo "[$(date +%H:%M:%S)] $*"; }
die()  { echo "[ERROR] $*" >&2; exit 1; }
warn() { echo "[WARN]  $*" >&2; }

# ── Production domain defaults (NEXT_PUBLIC_* are baked at build time) ───────
# Override any of these in your shell before calling this script if your
# domains differ from the defaults.
HUB_WEB_URL="${NEXT_PUBLIC_HUB_WEB_URL:-https://hub.irno.ir}"
CAREER_WEB_URL="${NEXT_PUBLIC_CAREER_WEB_URL:-https://cv.irno.ir}"
MEETINO_WEB_URL="${NEXT_PUBLIC_MEETINO_WEB_URL:-https://meet.irno.ir}"
MEETINO_CALLBACK_URL="${MEETINO_WEB_URL}/auth/irno/callback"

# ── Pre-flight ───────────────────────────────────────────────────────────────
command -v docker >/dev/null || die "docker not found."
[[ -f "${ENV_FILE}" ]] || \
  die "Env file not found: ${ENV_FILE}
  Copy infra/docker/.env.prod.example and fill in all values."
[[ -f "${COMPOSE_FILE}" ]] || die "Compose file not found: ${COMPOSE_FILE}"

log "================================================================="
log "  Irno Platform — Routine Deploy"
log "  Hub URL:    ${HUB_WEB_URL}"
log "  Career URL: ${CAREER_WEB_URL}"
log "  Meetino URL:${MEETINO_WEB_URL}"
log "================================================================="

# ── Step 1: Build Docker images ──────────────────────────────────────────────
#
# NEXT_PUBLIC_* vars must be passed as --build-arg because Next.js embeds them
# in the JavaScript bundle at build time. Runtime env vars have no effect on them.
#
log ""
log "Step 1/3: Building Docker images..."

log "  Building irno-hub-api:latest..."
docker build \
  -f "${REPO_ROOT}/apps/hub-api/Dockerfile" \
  -t irno-hub-api:latest \
  "${REPO_ROOT}"

log "  Building irno-hub-web:latest..."
docker build \
  -f "${REPO_ROOT}/apps/hub-web/Dockerfile" \
  --build-arg "NEXT_PUBLIC_API_URL=${HUB_WEB_URL}" \
  --build-arg "NEXT_PUBLIC_CAREER_WEB_URL=${CAREER_WEB_URL}" \
  --build-arg "NEXT_PUBLIC_MEETINO_CALLBACK_URL=${MEETINO_CALLBACK_URL}" \
  -t irno-hub-web:latest \
  "${REPO_ROOT}"

log "  Building irno-career-web:latest..."
docker build \
  -f "${REPO_ROOT}/apps/career-web/Dockerfile" \
  --build-arg "NEXT_PUBLIC_HUB_WEB_URL=${HUB_WEB_URL}" \
  --build-arg "NEXT_PUBLIC_CAREER_WEB_URL=${CAREER_WEB_URL}" \
  -t irno-career-web:latest \
  "${REPO_ROOT}"

log "  Building irno-meetino-api:latest..."
docker build \
  -f "${REPO_ROOT}/apps/meetino-api/Dockerfile" \
  -t irno-meetino-api:latest \
  "${REPO_ROOT}"

log "  Building irno-meetino-web:latest..."
docker build \
  -f "${REPO_ROOT}/apps/meetino-web/Dockerfile" \
  --build-arg "NEXT_PUBLIC_HUB_WEB_URL=${HUB_WEB_URL}" \
  --build-arg "NEXT_PUBLIC_LIVEKIT_URL=${MEETINO_WEB_URL}" \
  -t irno-meetino-web:latest \
  "${REPO_ROOT}"

log "  ✓ All images built"

# ── Step 2: Database migrations ──────────────────────────────────────────────
#
# Migrations MUST run before restarting app containers.
# Running on the new images ensures any new Prisma client is used.
#
log ""
log "Step 2/3: Running database migrations..."
"${SCRIPT_DIR}/migrate.sh"

# ── Step 3: Rolling restart of application containers ────────────────────────
#
# docker compose up -d with new images replaces running containers.
# Services restart in depends_on order (postgres/redis are already healthy).
# nginx and livekit are included so config changes take effect.
#
log ""
log "Step 3/3: Restarting application containers..."
${COMPOSE} up -d \
  hub-api \
  hub-web \
  career-web \
  meetino-api \
  meetino-web \
  nginx \
  livekit
log "  ✓ Containers restarted"

# ── Post-deploy health check ─────────────────────────────────────────────────
log ""
log "Running post-deploy health checks..."

sleep 5  # Brief pause for containers to initialise

if curl -sf "${HUB_WEB_URL}/api/v1/health" > /dev/null 2>&1; then
  log "  ✓ hub-api health check passed (${HUB_WEB_URL}/api/v1/health)"
else
  warn "  ⚠ hub-api health check failed — check logs:"
  warn "    docker compose -f ${COMPOSE_FILE} logs hub-api"
fi

# ── Done ─────────────────────────────────────────────────────────────────────
log ""
log "================================================================="
log "  ✅ Deployment complete."
log "================================================================="
log ""
log "  Verify:"
log "    curl -f ${HUB_WEB_URL}/api/v1/health"
log "    curl -f -o /dev/null -w '%{http_code}' ${HUB_WEB_URL}"
log "    curl -f -o /dev/null -w '%{http_code}' ${CAREER_WEB_URL}"
log "    curl -f -o /dev/null -w '%{http_code}' ${MEETINO_WEB_URL}"
log ""
log "  Logs:"
log "    docker compose -f ${COMPOSE_FILE} logs -f hub-api"
log ""
