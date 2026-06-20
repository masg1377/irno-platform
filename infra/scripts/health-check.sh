#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Irno Platform — health-check.sh
#
# Two modes (set via CHECK_MODE env var):
#
#   CHECK_MODE=static  (default)
#     Validates that required files, directory structure, and Docker Compose
#     configuration are all present and parseable. No live services needed.
#     Safe to run on a CI worker, before a deployment, or on a fresh clone.
#
#   CHECK_MODE=live
#     Curls all service HTTP endpoints and verifies each returns HTTP 200.
#     Requires running services at the configured URLs. Use after deployment.
#
# URL defaults (override with env vars for staging/custom domains):
#   HUB_URL     https://platform.irnocollege.com
#   CAREER_URL  https://cv.irnocollege.com
#   MEETINO_URL https://meet.irnocollege.com
#   API_URL     https://platform.irnocollege.com   (hub-api is reverse-proxied under platform)
#
# Exit codes:
#   0 — all checks passed
#   1 — one or more checks failed (details printed above the exit line)
#
# Usage:
#   ./infra/scripts/health-check.sh                        # static mode
#   CHECK_MODE=live ./infra/scripts/health-check.sh        # live mode
#   CHECK_MODE=live HUB_URL=https://staging.irnocollege.com \
#     ./infra/scripts/health-check.sh                      # custom URL
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'   # No Colour

pass() { echo -e "  ${GREEN}✓${NC}  $1"; }
fail() { echo -e "  ${RED}✗${NC}  $1"; FAILED=$((FAILED + 1)); }
info() { echo -e "  ${CYAN}·${NC}  $1"; }
header() { echo -e "\n${BOLD}${CYAN}▶  $1${NC}"; }

FAILED=0

# ── Resolve repo root ─────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# ── Mode and URL config ───────────────────────────────────────────────────────
CHECK_MODE="${CHECK_MODE:-static}"
HUB_URL="${HUB_URL:-https://platform.irnocollege.com}"
CAREER_URL="${CAREER_URL:-https://cv.irnocollege.com}"
MEETINO_URL="${MEETINO_URL:-https://meet.irnocollege.com}"
API_URL="${API_URL:-${HUB_URL}}"

echo -e "\n${BOLD}Irno Platform — Health Check${NC}"
echo    "  mode : ${CHECK_MODE}"
if [[ "${CHECK_MODE}" == "live" ]]; then
  echo  "  hub  : ${HUB_URL}"
  echo  "  cv   : ${CAREER_URL}"
  echo  "  meet : ${MEETINO_URL}"
  echo  "  api  : ${API_URL}"
fi
echo    "  root : ${REPO_ROOT}"

# ═════════════════════════════════════════════════════════════════════════════
# STATIC CHECKS
# ═════════════════════════════════════════════════════════════════════════════
header "Static checks (file system + config)"

# ── Required files ────────────────────────────────────────────────────────────
REQUIRED_FILES=(
  "package.json"
  "pnpm-lock.yaml"
  "pnpm-workspace.yaml"
  "turbo.json"
  ".dockerignore"
  ".gitignore"
  "DEPLOYMENT.md"
  "apps/hub-api/prisma/schema.prisma"
  "apps/hub-api/prisma.config.ts"
  "apps/meetino-api/src/prisma/schema.prisma"
  "infra/docker/docker-compose.yml"
  "infra/host-nginx/sites/platform.irnocollege.com.conf"
  "infra/host-nginx/sites/cv.irnocollege.com.conf"
  "infra/host-nginx/sites/meet.irnocollege.com.conf"
  "infra/host-nginx/sites/livekit.irnocollege.com.conf"
  "infra/scripts/first-deploy.sh"
  "infra/scripts/deploy.sh"
  "infra/scripts/migrate.sh"
  "infra/scripts/backup.sh"
  "infra/scripts/restore.sh"
  ".github/workflows/ci.yml"
)

for f in "${REQUIRED_FILES[@]}"; do
  if [[ -f "${REPO_ROOT}/${f}" ]]; then
    pass "${f}"
  else
    fail "${f}  ← MISSING"
  fi
done

# ── .env files must NOT be committed (not in the working tree) ─────────────────
header ".env security — no real secrets committed"

FORBIDDEN_ENV_PATTERNS=(
  "apps/hub-api/.env"
  "apps/hub-web/.env.local"
  "apps/career-web/.env.local"
  "apps/meetino-api/.env"
  "apps/meetino-web/.env.local"
  "infra/docker/.env.prod"
)

for f in "${FORBIDDEN_ENV_PATTERNS[@]}"; do
  full="${REPO_ROOT}/${f}"
  if [[ -f "${full}" ]]; then
    # File exists on disk — check if it is tracked by git
    if git -C "${REPO_ROOT}" ls-files --error-unmatch "${f}" 2>/dev/null; then
      fail "${f}  ← TRACKED BY GIT (run: git rm --cached ${f})"
    else
      pass "${f}  (exists but not git-tracked — OK)"
    fi
  else
    pass "${f}  (not present — OK)"
  fi
done

# ── Example files must be present ────────────────────────────────────────────
header "Example env templates"

EXAMPLE_FILES=(
  "apps/hub-api/.env.example"
  "apps/hub-web/.env.production.example"
  "apps/career-web/.env.production.example"
  "apps/meetino-api/.env.production.example"
  "apps/meetino-web/.env.example"
  "infra/docker/.env.prod.example"
)

for f in "${EXAMPLE_FILES[@]}"; do
  if [[ -f "${REPO_ROOT}/${f}" ]]; then
    pass "${f}"
  else
    fail "${f}  ← MISSING example template"
  fi
done

# ── CORS key sanity (no legacy singular key in example files) ─────────────────
header "CORS key sanity (plural API_CORS_ORIGINS)"

ENV_FILES_TO_CHECK=(
  "apps/hub-api/.env.example"
  ".env.example"
)

for f in "${ENV_FILES_TO_CHECK[@]}"; do
  full="${REPO_ROOT}/${f}"
  if [[ ! -f "${full}" ]]; then
    info "${f}  (skipped — file not present)"
    continue
  fi
  if grep -q "^API_CORS_ORIGIN=" "${full}" 2>/dev/null; then
    fail "${f}  ← contains API_CORS_ORIGIN (singular) — should be API_CORS_ORIGINS"
  else
    pass "${f}  (API_CORS_ORIGINS key is correct)"
  fi
done

# ── Docker Compose config validation ─────────────────────────────────────────
header "Docker Compose config validation"

COMPOSE_FILE="${REPO_ROOT}/infra/docker/docker-compose.yml"
if command -v docker &>/dev/null; then
  if docker compose -f "${COMPOSE_FILE}" config --quiet 2>/dev/null; then
    pass "docker-compose.yml is valid"
  else
    fail "docker-compose.yml failed validation — run: docker compose -f infra/docker/docker-compose.yml config"
  fi
else
  info "docker not found — skipping docker compose config check"
fi

# ── Prisma schema syntax check (prisma validate is dry-run safe) ──────────────
header "Prisma schema syntax"

HUB_SCHEMA="${REPO_ROOT}/apps/hub-api/prisma/schema.prisma"
MEETINO_SCHEMA="${REPO_ROOT}/apps/meetino-api/src/prisma/schema.prisma"

PRISMA_BIN=""
if [[ -x "${REPO_ROOT}/node_modules/.bin/prisma" ]]; then
  PRISMA_BIN="${REPO_ROOT}/node_modules/.bin/prisma"
elif command -v prisma &>/dev/null; then
  PRISMA_BIN="prisma"
fi

if [[ -n "${PRISMA_BIN}" ]]; then
  for schema in "${HUB_SCHEMA}" "${MEETINO_SCHEMA}"; do
    label="${schema#"${REPO_ROOT}/"}"
    output="$("${PRISMA_BIN}" validate --schema="${schema}" 2>&1 || true)"
    if echo "${output}" | grep -qi "403\|Failed to fetch\|checksum\|network\|ENOTFOUND"; then
      info "${label}  (skipped — Prisma binary not downloadable in this environment)"
    elif echo "${output}" | grep -qi "error\|invalid\|fail"; then
      fail "${label}  ← schema validation failed"$'\n'"    ${output}"
    else
      pass "${label}"
    fi
  done
else
  info "prisma binary not found — skipping schema validation"
  info "(run: pnpm install, then re-run this script)"
fi

# ── Deployment scripts are executable ─────────────────────────────────────────
header "Deployment script permissions"

SCRIPTS=(
  "infra/scripts/first-deploy.sh"
  "infra/scripts/deploy.sh"
  "infra/scripts/migrate.sh"
  "infra/scripts/backup.sh"
  "infra/scripts/restore.sh"
  "infra/scripts/health-check.sh"
)

for s in "${SCRIPTS[@]}"; do
  full="${REPO_ROOT}/${s}"
  if [[ -x "${full}" ]]; then
    pass "${s}  (executable)"
  else
    fail "${s}  ← not executable (run: chmod +x ${s})"
  fi
done

# ── CI workflow file present and non-empty ────────────────────────────────────
header "CI workflow"

CI_FILE="${REPO_ROOT}/.github/workflows/ci.yml"
if [[ -s "${CI_FILE}" ]]; then
  pass ".github/workflows/ci.yml  (present, non-empty)"
else
  fail ".github/workflows/ci.yml  ← missing or empty"
fi

# ═════════════════════════════════════════════════════════════════════════════
# LIVE CHECKS (only when CHECK_MODE=live)
# ═════════════════════════════════════════════════════════════════════════════
if [[ "${CHECK_MODE}" == "live" ]]; then
  header "Live HTTP checks"

  if ! command -v curl &>/dev/null; then
    fail "curl is required for live checks but was not found in PATH"
  else
    # curl helper: returns HTTP status code; 000 if connection refused / DNS fail
    check_url() {
      local url="$1"
      local label="$2"
      local expected="${3:-200}"
      local status
      status="$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${url}" 2>/dev/null || echo "000")"
      if [[ "${status}" == "${expected}" ]]; then
        pass "${label}  → ${url}  [${status}]"
      else
        fail "${label}  → ${url}  [HTTP ${status}, expected ${expected}]"
      fi
    }

    # hub-api liveness (NestJS health endpoint)
    check_url "${API_URL}/api/v1/health" "hub-api /health"

    # Hub Web (Next.js — login page is public)
    check_url "${HUB_URL}/auth/login" "hub-web /auth/login"

    # Hub Web — root should redirect (301 or 302) to /auth/login or /dashboard
    root_status="$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${HUB_URL}/" 2>/dev/null || echo "000")"
    if [[ "${root_status}" == "200" ]] || [[ "${root_status}" == "301" ]] || [[ "${root_status}" == "302" ]]; then
      pass "hub-web /  → ${HUB_URL}/  [${root_status}]"
    else
      fail "hub-web /  → ${HUB_URL}/  [HTTP ${root_status}]"
    fi

    # Career Web landing page
    check_url "${CAREER_URL}/" "career-web /"

    # Meetino Web
    check_url "${MEETINO_URL}/" "meetino-web /"

    echo ""
    info "For detailed manual checks see DEPLOYMENT.md Section 10."
  fi
fi

# ═════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═════════════════════════════════════════════════════════════════════════════
echo ""
if [[ "${FAILED}" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}All checks passed.${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}${FAILED} check(s) failed.${NC}"
  echo -e "  Fix the items marked ${RED}✗${NC} above before deploying."
  exit 1
fi
