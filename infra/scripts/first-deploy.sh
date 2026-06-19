#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Irno Platform — First Deployment  (run ONCE)
#
# Performs the one-time setup required before the platform can serve traffic:
#   1. Validates all required secrets in infra/docker/.env.prod
#   2. Runs database migrations (hub-api + meetino-api)
#   3. Seeds the first SUPER_ADMIN account (hub-api only, run once)
#   4. Starts all production services
#   5. Writes a guard file so this script cannot be re-run accidentally
#
# ⚠️  This script seeds the database.  Run ONCE only.
#     Subsequent deployments must use:  ./infra/scripts/deploy.sh
#
# ⛔  This script NEVER runs:
#       prisma migrate dev   — generates new migrations (dev only)
#       prisma migrate reset — drops all data
#       prisma db push       — bypasses migration history
#
# Usage:
#   ./infra/scripts/first-deploy.sh
#
# Required before running:
#   1. All Docker images built (see DEPLOYMENT.md §4 step 3)
#   2. infra/docker/.env.prod filled in (copy from .env.prod.example)
#   3. DNS A records live for hub.irno.ir, cv.irno.ir, meet.irno.ir
#
# After running:
#   Issue TLS certs — see DEPLOYMENT.md §4 steps 8-9
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

COMPOSE_FILE="${REPO_ROOT}/infra/docker/docker-compose.prod.yml"
ENV_FILE="${REPO_ROOT}/infra/docker/.env.prod"
STATE_DIR="${REPO_ROOT}/infra/.state"
GUARD_FILE="${STATE_DIR}/first-deploy.done"

COMPOSE="docker compose --env-file ${ENV_FILE} -f ${COMPOSE_FILE}"

log()  { echo "[$(date +%H:%M:%S)] $*"; }
die()  { echo "[ERROR] $*" >&2; exit 1; }
warn() { echo "[WARN]  $*" >&2; }

# ── Guard: prevent accidental re-run ────────────────────────────────────────
if [[ -f "${GUARD_FILE}" ]]; then
  echo ""
  echo "⛔  First deployment has already been completed."
  echo "    Guard file: ${GUARD_FILE}"
  echo "    Contents:   $(cat "${GUARD_FILE}")"
  echo ""
  echo "    For subsequent deployments use:  ./infra/scripts/deploy.sh"
  echo ""
  echo "    ⚠️  To force a re-run (dangerous — will attempt to re-seed):"
  echo "       rm ${GUARD_FILE} && ./infra/scripts/first-deploy.sh"
  echo ""
  exit 1
fi

log "================================================================="
log "  Irno Platform — First Deployment"
log "================================================================="

# ── Pre-flight: tools and files ──────────────────────────────────────────────
log "Checking prerequisites..."
command -v docker >/dev/null || die "docker not found. Install Docker Engine first."
[[ -f "${COMPOSE_FILE}" ]] || die "Compose file not found: ${COMPOSE_FILE}"
[[ -f "${ENV_FILE}" ]] || \
  die "Env file not found: ${ENV_FILE}
  Copy infra/docker/.env.prod.example to infra/docker/.env.prod and fill in ALL values."

log "  ✓ Prerequisites present"

# ── Validate secrets in env file ────────────────────────────────────────────
log "Validating secrets in ${ENV_FILE}..."

# Read a value from the env file (handles no-quote and quoted values)
_env_val() {
  grep -E "^$1=" "${ENV_FILE}" 2>/dev/null \
    | head -1 \
    | cut -d= -f2- \
    | sed "s/^['\"]//;s/['\"]$//"
}

POSTGRES_PASSWORD="$(_env_val POSTGRES_PASSWORD)"
REDIS_PASSWORD="$(_env_val REDIS_PASSWORD)"
HUB_JWT_ACCESS_SECRET="$(_env_val HUB_JWT_ACCESS_SECRET)"
HUB_JWT_REFRESH_SECRET="$(_env_val HUB_JWT_REFRESH_SECRET)"
SUPER_ADMIN_PASSWORD="$(_env_val SUPER_ADMIN_PASSWORD)"
SUPER_ADMIN_MOBILE="$(_env_val SUPER_ADMIN_MOBILE)"
SUPER_ADMIN_EMAIL="$(_env_val SUPER_ADMIN_EMAIL)"

# Fail on missing or placeholder values
_require() {
  local name="$1" value="$2"
  [[ -n "${value}" ]] \
    || die "${name} is empty in ${ENV_FILE} — fill in a real value."
  [[ "${value}" != *"GENERATE"* ]] \
    || die "${name} still contains a placeholder (GENERATE...) — replace it with a real secret.
  Generate one with:  openssl rand -hex 32"
  [[ "${value}" != *"CHANGE_ME"* ]] \
    || die "${name} still contains placeholder CHANGE_ME — replace with a real value."
}

_require POSTGRES_PASSWORD      "${POSTGRES_PASSWORD}"
_require REDIS_PASSWORD         "${REDIS_PASSWORD}"
_require HUB_JWT_ACCESS_SECRET  "${HUB_JWT_ACCESS_SECRET}"
_require HUB_JWT_REFRESH_SECRET "${HUB_JWT_REFRESH_SECRET}"
_require SUPER_ADMIN_PASSWORD   "${SUPER_ADMIN_PASSWORD}"
_require SUPER_ADMIN_MOBILE     "${SUPER_ADMIN_MOBILE}"
_require SUPER_ADMIN_EMAIL      "${SUPER_ADMIN_EMAIL}"

# Reject the known development default password
if [[ "${SUPER_ADMIN_PASSWORD}" == "IrnoAdmin@2026" ]]; then
  die "SUPER_ADMIN_PASSWORD is the development default (IrnoAdmin@2026).
  Use a strong unique password for production."
fi

# Minimum secret length checks
[[ "${#POSTGRES_PASSWORD}" -ge 16 ]] \
  || die "POSTGRES_PASSWORD must be at least 16 characters."
[[ "${#HUB_JWT_ACCESS_SECRET}" -ge 32 ]] \
  || die "HUB_JWT_ACCESS_SECRET must be at least 32 characters.
  Generate one with:  openssl rand -hex 32"
[[ "${#HUB_JWT_REFRESH_SECRET}" -ge 32 ]] \
  || die "HUB_JWT_REFRESH_SECRET must be at least 32 characters.
  Generate one with:  openssl rand -hex 32"

log "  ✓ All required secrets present and non-placeholder"

# ── Verify Docker images exist ───────────────────────────────────────────────
log "Checking Docker images..."
for IMAGE in irno-hub-api:latest irno-hub-web:latest irno-career-web:latest \
             irno-meetino-api:latest irno-meetino-web:latest; do
  docker image inspect "${IMAGE}" > /dev/null 2>&1 \
    || die "Docker image ${IMAGE} not found.
  Build all images first — see DEPLOYMENT.md §4 step 3."
done
log "  ✓ All Docker images present"

# ── Step 1: Database migrations ──────────────────────────────────────────────
log ""
log "Step 1/3: Running database migrations..."
"${SCRIPT_DIR}/migrate.sh"

# ── Step 2: Seed the first admin account ─────────────────────────────────────
#
# The seed reads SUPER_ADMIN_* from the compose environment.
# ts-node is a devDependency not present in the production image.
# We mount tsconfig files from the repository and use npx to run ts-node
# (npx downloads it on first use; requires outbound internet on the VPS).
#
# The seed is idempotent (uses upsert) but we guard against re-running
# via the guard file above.
#
log ""
log "Step 2/3: Seeding the first SUPER_ADMIN account..."
${COMPOSE} run --rm --no-deps \
  --volume "${REPO_ROOT}/apps/hub-api/tsconfig.json:/app/apps/hub-api/tsconfig.json:ro" \
  --volume "${REPO_ROOT}/apps/hub-api/tsconfig.seed.json:/app/apps/hub-api/tsconfig.seed.json:ro" \
  hub-api \
  sh -c "cd /app/apps/hub-api && npx ts-node --project tsconfig.seed.json prisma/seed.ts"
log "  ✓ Seed complete"

# ── Step 3: Start all services ───────────────────────────────────────────────
log ""
log "Step 3/3: Starting all production services..."
${COMPOSE} up -d
log "  ✓ All services started"

# ── Guard file ───────────────────────────────────────────────────────────────
mkdir -p "${STATE_DIR}"
{
  echo "First deployment completed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Host: $(hostname)"
  echo "Repo: ${REPO_ROOT}"
} > "${GUARD_FILE}"
log ""
log "  ✓ Guard file written: ${GUARD_FILE}"

# ── Done ─────────────────────────────────────────────────────────────────────
log ""
log "================================================================="
log "  ✅ First deployment complete."
log "================================================================="
log ""
log "  Next steps:"
log "  1. Issue TLS certificates (DNS A records must already be live):"
log "       docker compose -f ${COMPOSE_FILE} run --rm certbot \\"
log "         certonly --webroot -w /var/www/certbot \\"
log "         -d hub.irno.ir -d cv.irno.ir -d meet.irno.ir \\"
log "         --email admin@irno.ir --agree-tos --non-interactive"
log ""
log "  2. Reload nginx to activate HTTPS blocks:"
log "       docker exec irno-nginx nginx -s reload"
log ""
log "  3. Verify health:"
log "       curl -f https://hub.irno.ir/api/v1/health"
log ""
log "  4. Log in at https://hub.irno.ir/auth/login"
log "     Mobile: \$SUPER_ADMIN_MOBILE  (see ${ENV_FILE})"
log ""
log "  For future deployments:  ./infra/scripts/deploy.sh"
log ""
