# Irno Platform — Deployment Guide

This document covers production deployment of Irno Platform for private beta on a single VPS.

---

## 1. Production Architecture

```
VPS (Ubuntu 22.04 LTS, minimum 4 vCPU / 8 GB RAM)

  Nginx  (:80, :443)
  │
  ├── hub.irno.ir          → hub-web:3000
  ├── hub.irno.ir/api      → hub-api:4000
  ├── cv.irno.ir           → career-web:3002
  ├── cv.irno.ir/api       → hub-api:4000
  ├── meet.irno.ir         → meetino-web:3001
  └── meet.irno.ir/api     → meetino-api:4001

  Docker network: irno_net
  ├── hub-api          :4000   (NestJS, Playwright/Chromium)
  ├── hub-web          :3000   (Next.js standalone)
  ├── career-web       :3002   (Next.js standalone)
  ├── meetino-api      :4001   (NestJS)
  ├── meetino-web      :3001   (Next.js)
  ├── postgres         :5432   (internal only — no host port)
  ├── redis            :6379   (internal only — no host port)
  └── livekit          :7880-7882

  Persistent volumes:
  ├── postgres_data    → /var/lib/postgresql/data
  ├── redis_data       → /data
  └── hub_pdf_exports  → /app/storage/exports  (hub-api only)
```

**Planned domains:**
- `https://hub.irno.ir` — Hub Web (admin + student portal + Irno ID)
- `https://cv.irno.ir` — Career Web (Irno CV / Career Studio)
- `https://meet.irno.ir` — Meetino (online classroom)

---

## 2. Prerequisites

**VPS:**
- Ubuntu 22.04 LTS (or Debian 12)
- Docker Engine (not Docker Desktop)
- Docker Compose plugin (`docker compose`, not standalone `docker-compose`)
- Git

**Network / Firewall:**
- Port 80 (HTTP) — open inbound (Certbot ACME challenge, Nginx redirect to HTTPS)
- Port 443 (HTTPS) — open inbound
- Port 7880 (TCP) — LiveKit HTTP/TURN
- Port 7881 (TCP) — LiveKit TLS
- Port 7882 (UDP) — LiveKit WebRTC media — **must be open or WebRTC fails silently**
- PostgreSQL and Redis ports must NOT be exposed on host in production

**DNS:**
- A records for `hub.irno.ir`, `cv.irno.ir`, `meet.irno.ir` pointing to the VPS IP
- Records must propagate before running Certbot

---

## 3. Environment Files

Real `.env` files are not committed to the repository. Templates are provided:

| App | Template |
|-----|----------|
| hub-api | `apps/hub-api/.env.production.example` |
| hub-web | `apps/hub-web/.env.production.example` |
| career-web | `apps/career-web/.env.production.example` |
| meetino-api | `apps/meetino-api/.env.example` (check for production notes) |
| meetino-web | `apps/meetino-web/.env.example` |

Copy each template to the corresponding `.env` or `.env.local` file and fill in every value.

**Secret generation:**
```bash
openssl rand -hex 32
```
Use this for: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MEETINO_CLIENT_SECRET`, database passwords, Redis password, and `SUPER_ADMIN_PASSWORD`.

**⚠️ Critical:** The correct hub-api CORS key is `API_CORS_ORIGINS` (plural, comma-separated). An older example file contains `API_CORS_ORIGIN` (singular) — that key is wrong and will silently break all cross-origin requests.

---

## 4. First Deployment

Step-by-step commands for the initial production setup.

```bash
# 1. Clone the repository on the VPS
git clone https://github.com/your-org/irno-platform.git /opt/irno
cd /opt/irno

# 2. Create production env files from templates
cp apps/hub-api/.env.production.example apps/hub-api/.env
cp apps/hub-web/.env.production.example apps/hub-web/.env.local
cp apps/career-web/.env.production.example apps/career-web/.env.local
# Fill in all values — especially SUPER_ADMIN_PASSWORD before seeding

# 3. Build Docker images
# Note: NEXT_PUBLIC_* vars must be set in the shell or passed as build-args
# because they are baked into the JS bundle at build time.
docker build -f apps/hub-api/Dockerfile -t irno-hub-api:latest .
docker build -f apps/hub-web/Dockerfile \
  --build-arg NEXT_PUBLIC_CAREER_WEB_URL=https://cv.irno.ir \
  --build-arg NEXT_PUBLIC_MEETINO_CALLBACK_URL=https://meet.irno.ir/auth/irno/callback \
  -t irno-hub-web:latest .
docker build -f apps/career-web/Dockerfile \
  --build-arg NEXT_PUBLIC_HUB_WEB_URL=https://hub.irno.ir \
  --build-arg NEXT_PUBLIC_CAREER_WEB_URL=https://cv.irno.ir \
  -t irno-career-web:latest .
# Build meetino images similarly

# 4. Start infrastructure only (postgres + redis)
docker compose -f infra/docker/docker-compose.prod.yml up -d postgres redis
# Wait for postgres to be healthy (usually 10-15 seconds)
docker compose -f infra/docker/docker-compose.prod.yml ps

# 5. Run database migrations
# Hub (irno_hub database)
docker run --rm --network irno_net \
  --env-file apps/hub-api/.env \
  irno-hub-api:latest \
  sh -c "cd /app && npx prisma migrate deploy --schema=apps/hub-api/prisma/schema.prisma"

# Meetino (meetino_db database)
docker run --rm --network irno_net \
  --env-file apps/meetino-api/.env \
  irno-meetino-api:latest \
  sh -c "npx prisma migrate deploy"

# 6. Seed the first admin (run ONCE only — will error if run again)
# Ensure SUPER_ADMIN_MOBILE, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD are set
docker run --rm --network irno_net \
  --env-file apps/hub-api/.env \
  irno-hub-api:latest \
  sh -c "cd /app && pnpm --filter @irno/hub-api db:seed"

# 7. Start all app containers
docker compose -f infra/docker/docker-compose.prod.yml up -d

# 8. Start nginx + certbot (HTTP only at this point — HTTPS blocks need certs first)
docker compose -f infra/docker/docker-compose.prod.yml up -d nginx certbot

# 9. Issue TLS certificates (DNS A records must be live before this step)
docker compose -f infra/docker/docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d hub.irno.ir -d cv.irno.ir -d meet.irno.ir \
  --email admin@irno.ir --agree-tos --non-interactive

# Reload nginx to activate the HTTPS server blocks
docker exec irno-nginx nginx -s reload

# 10. Run health checks (see Section 10)
```

Nginx site configs are in `infra/nginx/sites/` — one file per domain. To change a domain name, edit the relevant `sites/*.conf` and `nginx.conf` cert paths, then run `docker exec irno-nginx nginx -s reload`.

Automatic certificate renewal runs inside the certbot container every 12 hours. Add this to the host cron to reload nginx after each renewal:
```
0 */12 * * * docker exec irno-nginx nginx -s reload
```

---

## 5. Routine Deployment

Safe order for every subsequent deployment:

```bash
cd /opt/irno

# 1. Pull latest code
git pull origin main

# 2. Rebuild images with new code
# (Same build commands as Step 3 in First Deployment)

# 3. Run database migrations before restarting apps
docker run --rm --network irno_net \
  --env-file apps/hub-api/.env \
  irno-hub-api:latest \
  sh -c "cd /app && npx prisma migrate deploy --schema=apps/hub-api/prisma/schema.prisma"

# 4. Restart app containers with new images
docker compose -f infra/docker/docker-compose.prod.yml up -d \
  hub-api hub-web career-web meetino-api meetino-web

# 5. Run health checks (see Section 10)

# 6. Verify login and PDF export work end-to-end
```

**Never restart app containers before migrations complete.**

---

## 6. Database Migrations

| Command | When to use |
|---------|-------------|
| `prisma migrate deploy` | Every production deployment — applies pending migrations only |
| `prisma generate` | Inside Dockerfile build stage — never at container runtime |
| `prisma migrate dev` | Local development only — generates new migration files |
| `prisma migrate reset` | **Never in production** — drops all tables and data |
| `prisma db push` | **Never in production** — bypasses migration history |
| `prisma db seed` | First deployment only — creates the SUPER_ADMIN account |

Migrations in this project follow an idempotent pattern (`IF NOT EXISTS`). Running `migrate deploy` on an already-migrated database is safe.

---

## 7. Seeding the First Admin

Before running `db:seed`, set these three environment variables in `apps/hub-api/.env`:

```
SUPER_ADMIN_MOBILE=09xxxxxxxxx
SUPER_ADMIN_EMAIL=admin@yourdomain.ir
SUPER_ADMIN_PASSWORD=<generated with openssl rand -hex 32>
```

**⚠️ The development default password (`IrnoAdmin@2026`) must never be used in production.** The seed script logs a warning if the default password is detected at runtime.

The seed is idempotent via `upsert` — re-running it will not duplicate data. However it is only needed once. After the first admin has logged in and set their own password, the `SUPER_ADMIN_PASSWORD` env var can be removed from the running container.

---

## 8. Playwright and PDF Export

hub-api is the only app that uses Playwright to generate PDFs.

**In Docker (production):** No extra steps needed. The `apps/hub-api/Dockerfile` installs Alpine system Chromium packages at build time and sets:
```
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

**On a local developer machine:** Run once after `pnpm install`:
```bash
pnpm --filter @irno/hub-api run postinstall:playwright
```

**Persistent volume requirement:**
`EXPORT_STORAGE_PATH` in hub-api `.env` must point to a directory backed by a persistent Docker volume. In Docker Compose, map `hub_pdf_exports` volume to `/app/storage/exports` in the hub-api service.

If this volume is missing or not mounted, PDF files will be written to the container's ephemeral filesystem and lost on every restart.

**Post-deploy smoke test for PDF export:**
1. Log in as an admin at `https://hub.irno.ir`
2. Navigate to Career Studio and open a resume
3. Trigger a PDF export
4. Verify the export reaches status `GENERATED` and the file downloads successfully

---

## 9. Backup and Recovery

Backup scripts are included:

```bash
# Manual backup
/opt/irno/infra/scripts/backup.sh

# Automated daily backup (add to crontab)
0 3 * * * /opt/irno/infra/scripts/backup.sh
```

The backup script covers:
- PostgreSQL `irno_hub` database
- PostgreSQL `meetino_db` database
- PDF export files from hub-api storage

Recovery:
```bash
/opt/irno/infra/scripts/restore.sh <backup-file>
```

Backups are retained for 30 days by default. Verify that backups include the PDF export volume in addition to PostgreSQL dumps.

---

## 10. Health Checks

Run after every deployment to verify all services are up:

```bash
# hub-api health endpoint
curl -f https://hub.irno.ir/api/v1/health

# hub-web homepage
curl -f -o /dev/null -w "%{http_code}" https://hub.irno.ir

# career-web homepage
curl -f -o /dev/null -w "%{http_code}" https://cv.irno.ir

# meetino-web homepage
curl -f -o /dev/null -w "%{http_code}" https://meet.irno.ir
```

**Expected results:** All return HTTP 200.

**Manual verification checklist:**
- [ ] Hub login page loads at `https://hub.irno.ir/auth/login`
- [ ] Admin can log in and reach the dashboard
- [ ] Career Studio loads at `https://cv.irno.ir`
- [ ] A resume can be created and edited
- [ ] PDF export reaches status `GENERATED`
- [ ] Meetino loads at `https://meet.irno.ir`
- [ ] A test meeting can be created and joined

**Note:** A `health-check.sh` script is to be added in Phase 10.4.

---

## 11. Common Problems and Fixes

**CORS errors in browser:**
Check `API_CORS_ORIGINS` (plural) in hub-api `.env`. The old variable name `API_CORS_ORIGIN` (singular) is a known documentation typo that does not work.

**Login cookie not saved after login:**
- Verify the app is served over HTTPS in production
- Check that hub-api sets `secure: true` on cookies — this is automatic when `NODE_ENV=production`
- Check that hub-web and hub-api share the same top-level domain or the cookie domain is set correctly
- Verify `sameSite: lax` is correct for your browser's cross-site behaviour

**PDF export stays in PENDING status or returns error:**
- Check that the `hub_pdf_exports` Docker volume is mounted at `/app/storage/exports` in hub-api
- Check that the hub-api container has write permission to that path
- Check hub-api logs for Chromium startup errors: `docker logs irno-hub-api`
- On Alpine/Docker: confirm the `chromium` system package installed correctly at build time

**Redis connection fails:**
- In Docker, `REDIS_HOST` must be the compose service name (`redis`), not `localhost`
- Verify `REDIS_PASSWORD` matches the Redis container's `--requirepass` value
- Run: `docker exec irno-redis redis-cli -a YOUR_PASSWORD ping` — should return `PONG`

**LiveKit video/audio not working:**
- Verify **UDP port 7882** is open in the VPS firewall — this is the most common LiveKit failure
- Run: `lsof -i udp:7882` on the VPS to confirm the port is bound
- Check that the LiveKit `LIVEKIT_URL` in meetino-api `.env` uses a public address

**Frontend shows wrong URLs (e.g. localhost instead of production domain):**
`NEXT_PUBLIC_*` variables are baked into the JavaScript bundle at `next build` time. If they were wrong or missing at build time, rebuilding the Docker image is the only fix.

**Meetino SSO broken after Hub deployment:**
- Verify `MEETINO_CLIENT_SECRET` in hub-api `.env` matches `IRNO_HUB_CLIENT_SECRET` in meetino-api `.env`
- Verify the callback URL in `MEETINO_ALLOWED_REDIRECT_URLS` matches exactly (scheme, host, path — no trailing slash)
