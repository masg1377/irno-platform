#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Irno Platform — First Deployment  (run ONCE)
#
# Performs the one-time setup required before the platform can serve traffic:
#   0. Generates /opt/irno/secrets/livekit.prod.yaml from .env.prod values
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
#   1. All Docker images built (see DEPLOYMENT.md §4)
#   2. infra/docker/.env.prod filled in (copy from .env.prod.example)
#   3. DNS A records live for all four domains
#
# After running:
#   Issue TLS certificates via host Certbot — see DEPLOYMENT.md §4 "TLS"
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

# Read a value from the env file (handles unquoted and quoted values)
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
LIVEKIT_API_KEY="$(_env_val LIVEKIT_API_KEY)"
LIVEKIT_API_SECRET="$(_env_val LIVEKIT_API_SECRET)"

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
  [[ "${value}" != *"PLACEHOLDER"* ]] \
    || die "${name} still contains PLACEHOLDER — replace with a real value."
}

_require POSTGRES_PASSWORD      "${POSTGRES_PASSWORD}"
_require REDIS_PASSWORD         "${REDIS_PASSWORD}"
_require HUB_JWT_ACCESS_SECRET  "${HUB_JWT_ACCESS_SECRET}"
_require HUB_JWT_REFRESH_SECRET "${HUB_JWT_REFRESH_SECRET}"
_require SUPER_ADMIN_PASSWORD   "${SUPER_ADMIN_PASSWORD}"
_require SUPER_ADMIN_MOBILE     "${SUPER_ADMIN_MOBILE}"
_require SUPER_ADMIN_EMAIL      "${SUPER_ADMIN_EMAIL}"
_require LIVEKIT_API_KEY        "${LIVEKIT_API_KEY}"
_require LIVEKIT_API_SECRET     "${LIVEKIT_API_SECRET}"

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
[[ "${#LIVEKIT_API_SECRET}" -ge 32 ]] \
  || die "LIVEKIT_API_SECRET must be at least 32 characters.
  Generate one with:  openssl rand -hex 32"

log "  ✓ All required secrets present and non-placeholder"

# ── Step 0: Generate LiveKit server config ────────────────────────────────────
#
# The real livekit.prod.yaml lives at /opt/irno/secrets/ — outside the repo.
# It is never committed to git (would expose API keys).
# We generate it here from the .env.prod values.
#
log ""
log "Step 0/4: Generating LiveKit production config..."

SECRETS_DIR="/opt/irno/secrets"
LIVEKIT_CONFIG="${SECRETS_DIR}/livekit.prod.yaml"

if [[ -f "${LIVEKIT_CONFIG}" ]]; then
  log "  ✓ LiveKit config already exists at ${LIVEKIT_CONFIG} (skipping generation)"
  log "    To regenerate: rm ${LIVEKIT_CONFIG} && re-run this script"
else
  mkdir -p "${SECRETS_DIR}"
  cat > "${LIVEKIT_CONFIG}" << LKEOF
# LiveKit production config — generated by first-deploy.sh
# Do NOT edit this file directly; re-run first-deploy.sh to regenerate.
port: 7880
log_level: info
bind_addresses:
  - ""

rtc:
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: true

turn:
  enabled: false

logging:
  level: info
  json: false

keys:
  ${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}
LKEOF
  chmod 0600 "${LIVEKIT_CONFIG}"
  log "  ✓ LiveKit config written to ${LIVEKIT_CONFIG}  (chmod 0600)"
fi

# ── Verify Docker images exist ───────────────────────────────────────────────
log ""
log "Checking Docker images..."
for IMAGE in irno-hub-api:latest irno-hub-web:latest irno-career-web:latest \
             irno-meetino-api:latest irno-meetino-web:latest; do
  docker image inspect "${IMAGE}" > /dev/null 2>&1 \
    || die "Docker image ${IMAGE} not found.
  Build all images first — see DEPLOYMENT.md §4."
done
log "  ✓ All Docker images present"

# ── Step 1: Database migrations ──────────────────────────────────────────────
log ""
log "Step 1/4: Running database migrations..."
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
log "Step 2/4: Seeding the first SUPER_ADMIN account..."
${COMPOSE} run --rm --no-deps \
  --volume "${REPO_ROOT}/apps/hub-api/tsconfig.json:/app/apps/hub-api/tsconfig.json:ro" \
  --volume "${REPO_ROOT}/apps/hub-api/tsconfig.seed.json:/app/apps/hub-api/tsconfig.seed.json:ro" \
  hub-api \
  sh -c "cd /app/apps/hub-api && npx ts-node --project tsconfig.seed.json prisma/seed.ts"
log "  ✓ Seed complete"

# ── Step 3: Start all services ───────────────────────────────────────────────
#
# ⚠️  nginx and certbot are NOT started here — TLS is handled by host Nginx.
#     Host Nginx config: infra/host-nginx/sites/
#
log ""
log "Step 3/4: Starting all production services..."
${COMPOSE} up -d \
  postgres \
  redis \
  livekit \
  hub-api \
  hub-web \
  career-web \
  meetino-api \
  meetino-web
log "  ✓ All services started"

# ── Step 4: Brief health check ───────────────────────────────────────────────
log ""
log "Step 4/4: Waiting for hub-api to become healthy..."
sleep 8

HUB_URL="${NEXT_PUBLIC_HUB_WEB_URL:-https://platform.irnocollege.com}"
if curl -sf "http://127.0.0.1:14000/api/v1/health" > /dev/null 2>&1; then
  log "  ✓ hub-api is healthy (127.0.0.1:14000)"
else
  warn "  ⚠ hub-api health check failed — check logs:"
  warn "    docker compose -f ${COMPOSE_FILE} logs hub-api"
fi

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
log ""
log "  1. Install host Nginx site configs (DNS A records must already be live):"
log "       sudo cp ${REPO_ROOT}/infra/host-nginx/sites/*.conf /etc/nginx/sites-available/"
log "       cd /etc/nginx/sites-available && for f in platform.irnocollege.com.conf cv.irnocollege.com.conf meet.irnocollege.com.conf livekit.irnocollege.com.conf; do"
log "         sudo ln -sf /etc/nginx/sites-available/\$f /etc/nginx/sites-enabled/\$f"
log "       done"
log "       sudo nginx -t && sudo nginx -s reload"
log ""
log "  2. Issue TLS certificates for all four domains:"
log "       sudo certbot --nginx \\"
log "         -d platform.irnocollege.com \\"
log "         -d cv.irnocollege.com \\"
log "         -d meet.irnocollege.com \\"
log "         -d livekit.irnocollege.com \\"
log "         --email admin@irnocollege.com --agree-tos --non-interactive"
log "       sudo nginx -s reload"
log ""
log "  3. Verify health:"
log "       curl -f http://127.0.0.1:14000/api/v1/health   # direct container"
log "       curl -f https://platform.irnocollege.com/api/v1/health  # via Nginx"
log ""
log "  4. Log in at https://platform.irnocollege.com/auth/login"
log "     Mobile: \$SUPER_ADMIN_MOBILE  (see ${ENV_FILE})"
log ""
log "  5. Enable Meetino SSO (optional — after both Hub and Meetino are live):"
log "     Set IRNO_HUB_SSO_ENABLED=true in ${ENV_FILE}"
log "     Set MEETINO_ENABLED=true in ${ENV_FILE}  (already true by default)"
log "     Verify MEETINO_CLIENT_SECRET matches IRNO_HUB_CLIENT_SECRET on both sides."
log "     Restart: docker compose up -d hub-api meetino-api"
log ""
log "  For future deployments:  ./infra/scripts/deploy.sh"
log ""
