# Irno Platform — Backup & Restore Guide

## What Gets Backed Up

| Data | Location | Script |
|---|---|---|
| PostgreSQL `irno_hub` | Docker volume `irno-postgres` | `backup.sh` |
| PostgreSQL `meetino_db` | Docker volume `irno-postgres` | `backup.sh` |
| PDF export files | `apps/hub-api/storage/exports/` | `backup.sh` |

Redis is **not backed up** — it holds only ephemeral data (rate-limit counters, OTP codes, SSO codes, session presence). It is safe to restart with an empty Redis.

---

## Backup

### Manual backup

```bash
# From repo root
export PGPASSWORD="your-db-password"
export BACKUP_DIR="/var/backups/irno"
export POSTGRES_HOST="localhost"
export POSTGRES_PORT="5432"   # 5433 in local dev

./infra/scripts/backup.sh
```

### Automated daily backup (cron)

Add to root crontab (`crontab -e`):

```cron
# Irno Platform — Daily backup at 03:00 UTC
0 3 * * * PGPASSWORD="your-db-password" BACKUP_DIR="/var/backups/irno" /path/to/irno-platform/infra/scripts/backup.sh >> /var/log/irno-backup.log 2>&1
```

### Backup output structure

```
/var/backups/irno/
  20260616_030000/
    irno_hub.sql.gz      ← Hub database
    meetino_db.sql.gz    ← Meetino database
    pdf_exports.tar.gz   ← PDF export files
    MANIFEST.txt         ← Backup metadata
  20260615_030000/
    ...
```

Backups older than **30 days** are automatically pruned.

---

## Restore

⚠️ **The restore script DROPS and RECREATES the target databases. Run during a maintenance window only.**

### Steps

```bash
# 1. Stop application services first
docker compose -f infra/docker/docker-compose.prod.example.yml stop hub-api meetino-api

# 2. Set credentials
export PGPASSWORD="your-db-password"
export POSTGRES_HOST="localhost"
export POSTGRES_PORT="5432"

# 3. Run restore (pass the backup directory as argument)
./infra/scripts/restore.sh /var/backups/irno/20260616_030000

# 4. Restart services
docker compose -f infra/docker/docker-compose.prod.example.yml start hub-api meetino-api

# 5. Verify health
curl http://localhost:4000/api/v1/health/live
curl http://localhost:4001/api/v1/health/live
```

---

## Verify a Backup Without Restoring

```bash
# Check database dump integrity
gunzip -t /var/backups/irno/20260616_030000/irno_hub.sql.gz && echo "OK"

# List dump contents
gunzip -c /var/backups/irno/20260616_030000/irno_hub.sql.gz | head -30

# Check PDF archive integrity
tar -tzf /var/backups/irno/20260616_030000/pdf_exports.tar.gz | head -20
```

---

## Offsite Storage

For production, copy backups to offsite storage after each run. Example using `rclone`:

```bash
# Configure rclone once: rclone config
# Then add to cron after backup.sh:
rclone sync /var/backups/irno remote:irno-backups/$(hostname) --max-age 30d
```

Alternatively: AWS S3, Cloudflare R2, Backblaze B2, or any S3-compatible provider.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PGPASSWORD` | *required* | PostgreSQL password |
| `POSTGRES_HOST` | `localhost` | DB host |
| `POSTGRES_PORT` | `5432` | DB port (use `5433` for local dev) |
| `POSTGRES_USER` | `irno` | DB user |
| `BACKUP_DIR` | `/var/backups/irno` | Where to store backup files |
| `EXPORT_STORAGE_PATH` | `apps/hub-api/storage/exports` | PDF exports path |
| `RETENTION_DAYS` | `30` | Days to keep before pruning |

---

## Tested Restore Checklist

Run this after every restore to confirm data integrity:

- [ ] `GET /api/v1/health/ready` returns `200` for hub-api
- [ ] `GET /api/v1/health/ready` returns `200` for meetino-api  
- [ ] Admin login works (`admin@irnocollege.com`)
- [ ] Student list loads in Hub
- [ ] Course list loads in Hub
- [ ] At least one PDF export is downloadable from Career Studio
- [ ] Meetino meeting list loads
