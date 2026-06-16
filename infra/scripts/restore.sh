#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Irno Platform — Production Restore Script
#
# Restores:
#   1. PostgreSQL databases from a backup directory
#   2. PDF export files from the tar archive
#
# Usage:
#   ./infra/scripts/restore.sh /var/backups/irno/20260616_030000
#
# ⚠️  WARNING: This script DROPS and RECREATES the target databases.
#              All existing data will be permanently lost.
#              Only run this during a maintenance window.
#
# Required env vars:
#   POSTGRES_HOST        — default: localhost
#   POSTGRES_PORT        — default: 5432
#   POSTGRES_USER        — default: irno
#   PGPASSWORD           — PostgreSQL password
#   EXPORT_STORAGE_PATH  — where to restore PDF exports
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# ── Arguments ────────────────────────────────────────────────────────────────
BACKUP_DATE_DIR="${1:-}"
[[ -n "${BACKUP_DATE_DIR}" ]] || {
  echo "Usage: $0 <backup-directory>"
  echo "Example: $0 /var/backups/irno/20260616_030000"
  exit 1
}
[[ -d "${BACKUP_DATE_DIR}" ]] || { echo "[ERROR] Directory not found: ${BACKUP_DATE_DIR}" >&2; exit 1; }

# ── Configuration ────────────────────────────────────────────────────────────
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-irno}"
EXPORT_STORAGE_PATH="${EXPORT_STORAGE_PATH:-${REPO_ROOT}/apps/hub-api/storage/exports}"

DATABASES=("irno_hub" "meetino_db")

# ── Helpers ──────────────────────────────────────────────────────────────────
log()  { echo "[$(date +%H:%M:%S)] $*"; }
die()  { echo "[ERROR] $*" >&2; exit 1; }

# ── Pre-flight ───────────────────────────────────────────────────────────────
command -v psql    >/dev/null || die "psql not found."
command -v gunzip  >/dev/null || die "gunzip not found."
command -v tar     >/dev/null || die "tar not found."

[[ -n "${PGPASSWORD:-}" ]] || die "PGPASSWORD is not set."

# ── Confirmation ─────────────────────────────────────────────────────────────
echo ""
echo "⚠️  RESTORE WARNING"
echo "   Backup source : ${BACKUP_DATE_DIR}"
echo "   Target host   : ${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "   Databases     : ${DATABASES[*]}"
echo "   This will DROP and RECREATE these databases."
echo ""
read -r -p "Type YES to continue: " CONFIRM
[[ "${CONFIRM}" == "YES" ]] || { echo "Aborted."; exit 0; }

# ── 1. Restore PostgreSQL databases ──────────────────────────────────────────
for DB in "${DATABASES[@]}"; do
  DUMP_FILE="${BACKUP_DATE_DIR}/${DB}.sql.gz"

  if [[ ! -f "${DUMP_FILE}" ]]; then
    log "⚠ Dump not found for ${DB}: ${DUMP_FILE} — skipping"
    continue
  fi

  log "Restoring database: ${DB}"

  # Drop existing database (terminate connections first)
  psql \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --no-password \
    --dbname=postgres \
    --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB}' AND pid <> pg_backend_pid();" \
    > /dev/null 2>&1 || true

  psql \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --no-password \
    --dbname=postgres \
    --command="DROP DATABASE IF EXISTS ${DB};" \
    > /dev/null

  psql \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --no-password \
    --dbname=postgres \
    --command="CREATE DATABASE ${DB} OWNER ${POSTGRES_USER} ENCODING 'UTF8';" \
    > /dev/null

  # Restore from dump
  gunzip -c "${DUMP_FILE}" | psql \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --no-password \
    --dbname="${DB}" \
    > /dev/null

  log "  ✓ ${DB} restored"
done

# ── 2. Restore PDF exports ────────────────────────────────────────────────────
EXPORTS_ARCHIVE="${BACKUP_DATE_DIR}/pdf_exports.tar.gz"

if [[ -f "${EXPORTS_ARCHIVE}" ]]; then
  log "Restoring PDF exports to: ${EXPORT_STORAGE_PATH}"
  EXPORTS_PARENT="$(dirname "${EXPORT_STORAGE_PATH}")"
  mkdir -p "${EXPORTS_PARENT}"
  tar -xzf "${EXPORTS_ARCHIVE}" -C "${EXPORTS_PARENT}"
  log "  ✓ PDF exports restored"
else
  log "  ⚠ No PDF exports archive found in backup — skipping"
fi

# ── Done ─────────────────────────────────────────────────────────────────────
log "✅ Restore complete from: ${BACKUP_DATE_DIR}"
log "   Next steps:"
log "   1. Run: cd apps/hub-api && pnpm db:generate"
log "   2. Restart hub-api and meetino-api services"
log "   3. Verify application health endpoints"
