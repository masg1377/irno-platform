#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Irno Platform — Production Backup Script
#
# Backs up:
#   1. PostgreSQL databases (irno_hub + meetino_db) via pg_dump
#   2. PDF export files (apps/hub-api/storage/exports)
#
# Usage:
#   ./infra/scripts/backup.sh
#   BACKUP_DIR=/mnt/backups ./infra/scripts/backup.sh
#
# Required env vars (set in shell or .env.backup):
#   POSTGRES_HOST        — default: localhost
#   POSTGRES_PORT        — default: 5433 (dev) / 5432 (prod inside Docker)
#   POSTGRES_USER        — default: irno
#   PGPASSWORD           — PostgreSQL password (standard pg env var)
#   BACKUP_DIR           — where to store backups (default: /var/backups/irno)
#   EXPORT_STORAGE_PATH  — path to PDF export files (default: apps/hub-api/storage/exports)
#
# Retention: keeps last 30 days of backups. Older files are pruned automatically.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-irno}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/irno}"
EXPORT_STORAGE_PATH="${EXPORT_STORAGE_PATH:-${REPO_ROOT}/apps/hub-api/storage/exports}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DATE_DIR="${BACKUP_DIR}/${TIMESTAMP}"

# Databases to back up
DATABASES=("irno_hub" "meetino_db")

# ── Helpers ──────────────────────────────────────────────────────────────────
log()  { echo "[$(date +%H:%M:%S)] $*"; }
die()  { echo "[ERROR] $*" >&2; exit 1; }

# ── Pre-flight checks ────────────────────────────────────────────────────────
command -v pg_dump  >/dev/null || die "pg_dump not found. Install postgresql-client."
command -v gzip     >/dev/null || die "gzip not found."
command -v tar      >/dev/null || die "tar not found."

[[ -n "${PGPASSWORD:-}" ]] || die "PGPASSWORD is not set. Export it before running this script."

# ── Create backup directory ──────────────────────────────────────────────────
mkdir -p "${BACKUP_DATE_DIR}"
log "Backup directory: ${BACKUP_DATE_DIR}"

# ── 1. PostgreSQL dumps ──────────────────────────────────────────────────────
for DB in "${DATABASES[@]}"; do
  log "Dumping database: ${DB}"
  DUMP_FILE="${BACKUP_DATE_DIR}/${DB}.sql.gz"
  pg_dump \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --no-password \
    --format=plain \
    --encoding=UTF-8 \
    "${DB}" \
    | gzip -9 > "${DUMP_FILE}"
  log "  ✓ ${DUMP_FILE} ($(du -sh "${DUMP_FILE}" | cut -f1))"
done

# ── 2. PDF export files ──────────────────────────────────────────────────────
if [[ -d "${EXPORT_STORAGE_PATH}" ]]; then
  log "Archiving PDF exports: ${EXPORT_STORAGE_PATH}"
  EXPORTS_ARCHIVE="${BACKUP_DATE_DIR}/pdf_exports.tar.gz"
  tar -czf "${EXPORTS_ARCHIVE}" -C "$(dirname "${EXPORT_STORAGE_PATH}")" "$(basename "${EXPORT_STORAGE_PATH}")"
  log "  ✓ ${EXPORTS_ARCHIVE} ($(du -sh "${EXPORTS_ARCHIVE}" | cut -f1))"
else
  log "  ⚠ Export storage path not found: ${EXPORT_STORAGE_PATH} — skipping PDF backup"
fi

# ── 3. Write manifest ────────────────────────────────────────────────────────
MANIFEST="${BACKUP_DATE_DIR}/MANIFEST.txt"
{
  echo "irno-platform backup"
  echo "Timestamp : ${TIMESTAMP}"
  echo "Host      : $(hostname)"
  echo "PG host   : ${POSTGRES_HOST}:${POSTGRES_PORT}"
  echo "Databases : ${DATABASES[*]}"
  echo "Files:"
  ls -lh "${BACKUP_DATE_DIR}"
} > "${MANIFEST}"
log "Manifest written: ${MANIFEST}"

# ── 4. Prune old backups ─────────────────────────────────────────────────────
log "Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -maxdepth 1 -mindepth 1 -type d -mtime "+${RETENTION_DAYS}" -print -exec rm -rf {} +

# ── Done ─────────────────────────────────────────────────────────────────────
log "✅ Backup complete: ${BACKUP_DATE_DIR}"
