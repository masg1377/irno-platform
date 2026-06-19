#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Irno Platform — Production Database Migration
#
# Applies pending migrations for both databases:
#   hub-api     → irno_hub    (Prisma 7 — config via prisma.config.ts)
#   meetino-api → meetino_db  (Prisma 5 — schema at src/prisma/schema.prisma)
#
# Safe to run multiple times (idempotent).
# All migrations in this project use IF NOT EXISTS — re-running is harmless.
#
# ⛔  This script NEVER runs:
#       prisma migrate dev   — generates new migrations (dev only)
#       prisma migrate reset — drops all data
#       prisma db push       — bypasses migration history
#       db:seed              — use first-deploy.sh for seeding
#
# Usage:
#   ./infra/scripts/migrate.sh
#
# Required:
#   infra/docker/.env.prod          — production env file
#   infra/docker/docker-compose.prod.yml
#   Docker images already built:   irno-hub-api:latest  irno-meetino-api:latest
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

COMPOSE_FILE="${REPO_ROOT}/infra/docker/docker-compose.prod.yml"
ENV_FILE="${REPO_ROOT}/infra/docker/.env.prod"

COMPOSE="docker compose --env-file ${ENV_FILE} -f ${COMPOSE_FILE}"

log()  { echo "[$(date +%H:%M:%S)] $*"; }
die()  { echo "[ERROR] $*" >&2; exit 1; }

# ── Pre-flight ───────────────────────────────────────────────────────────────
command -v docker >/dev/null || die "docker not found. Install Docker Engine first."
[[ -f "${ENV_FILE}" ]] || \
  die "Env file not found: ${ENV_FILE}
  Copy infra/docker/.env.prod.example to infra/docker/.env.prod and fill in all values."
[[ -f "${COMPOSE_FILE}" ]] || \
  die "Compose file not found: ${COMPOSE_FILE}"

# Verify hub-api image is built
docker image inspect irno-hub-api:latest > /dev/null 2>&1 || \
  die "Docker image irno-hub-api:latest not found. Build it first:
  docker build -f apps/hub-api/Dockerfile -t irno-hub-api:latest ."

# Verify meetino-api image is built
docker image inspect irno-meetino-api:latest > /dev/null 2>&1 || \
  die "Docker image irno-meetino-api:latest not found. Build it first:
  docker build -f apps/meetino-api/Dockerfile -t irno-meetino-api:latest ."

# ── Start postgres and redis ─────────────────────────────────────────────────
log "Starting postgres and redis (if not already running)..."
${COMPOSE} up -d postgres redis

# ── Wait for postgres to be healthy ─────────────────────────────────────────
log "Waiting for postgres to be healthy..."
RETRIES=30
until ${COMPOSE} exec -T postgres pg_isready > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [[ ${RETRIES} -le 0 ]]; then
    die "Postgres did not become healthy after 60 seconds.
  Check logs: docker compose -f ${COMPOSE_FILE} logs postgres"
  fi
  sleep 2
done
log "  ✓ Postgres is healthy"

# ── Hub API — irno_hub (Prisma 7) ────────────────────────────────────────────
#
# Prisma 7 does NOT read DATABASE_URL from schema.prisma's datasource block.
# It reads configuration from prisma.config.ts. That file is NOT copied into
# the production Docker image (it is a TypeScript source file), so we mount it
# from the repository here.
#
# DATABASE_URL is provided via the compose environment (irno_hub database).
#
log "Running hub-api migrations (irno_hub)..."
${COMPOSE} run --rm --no-deps \
  --volume "${REPO_ROOT}/apps/hub-api/prisma.config.ts:/app/apps/hub-api/prisma.config.ts:ro" \
  hub-api \
  sh -c "cd /app/apps/hub-api && npx prisma migrate deploy"
log "  ✓ hub-api migrations applied"

# ── Meetino API — meetino_db (Prisma 5) ───────────────────────────────────────
#
# Meetino uses Prisma 5 (standard datasource url = env(...) in schema).
# The schema lives at src/prisma/schema.prisma inside the container.
# DATABASE_URL is provided via the compose environment (meetino_db database).
#
log "Running meetino-api migrations (meetino_db)..."
${COMPOSE} run --rm --no-deps \
  meetino-api \
  sh -c "cd /app/apps/meetino-api && npx prisma migrate deploy --schema=src/prisma/schema.prisma"
log "  ✓ meetino-api migrations applied"

log ""
log "✅ All migrations complete."
