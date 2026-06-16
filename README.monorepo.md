# Irno Platform — Monorepo Guide

This document covers the monorepo structure, ownership boundaries, local development, deployment, and integration between Hub and Meetino.

---

## 1. Monorepo Structure

```
irno-platform/
  apps/
    hub-web/          — Hub: Next.js 16 frontend (Persian RTL, Tailwind)
    hub-api/          — Hub: NestJS 11 backend (REST API, JWT auth, Prisma)
    meetino-web/      — Meetino: Next.js frontend (video meeting UI)
    meetino-api/      — Meetino: NestJS backend (meetings, LiveKit, WebSocket)
  packages/
    types/            — @irno/types: Hub shared TypeScript types and enums
    validators/       — @irno/validators: Hub shared Zod schemas
    i18n/             — @irno/i18n: Persian translation strings (Hub)
    theme/            — @irno/theme: design tokens (Hub)
    utils/            — @irno/utils: shared utilities (Hub)
    config/           — @irno/config: shared ESLint/TS config
    meetino-shared/   — @irno/meetino-shared: Meetino shared types/enums
    auth-client/      — @irno/auth-client: Irno ID auth URL builder SDK (OIDC-ready, not full OIDC)
    # NOTE: packages/ui-web is intentionally deferred.
    # Hub and Meetino each maintain their own UI component libraries.
    # A shared UI package will be extracted only when stable, repeated components
    # emerge naturally across both apps. Do not create packages/ui-web prematurely.
  infra/
    docker/
      docker-compose.dev.yml          — local dev infrastructure
      docker-compose.prod.example.yml — production deployment reference
      postgres/
        init-multiple-dbs.sql         — creates irno_hub + meetino_db databases
      livekit/
        livekit.yaml                  — LiveKit dev config
        livekit.prod.yaml             — LiveKit prod config
      coturn/
        turnserver.conf               — TURN server config
  package.json        — root workspace scripts
  pnpm-workspace.yaml — pnpm workspace definition
  turbo.json          — Turborepo pipeline config
  CLAUDE.md           — project context and architecture (AI instructions)
  README.monorepo.md  — this file
```

---

## 2. App Ownership Boundaries

**Hub owns academy/business data:**
- users, profiles, roles, applicants, students
- courses, course groups, enrollments, payments, installments
- notifications, events, reports, analytics
- MeetinoMeetingReference records (Hub-side meeting bookkeeping)

**Meetino owns meeting/runtime data:**
- meetings, participants, chat messages
- LiveKit video sessions and tokens
- whiteboard state, shared files
- guest sessions (meeting-scoped, temporary)
- attendance records (runtime join/leave events)

**Rule:** Hub and Meetino communicate through APIs and SSO handoff. Neither app directly reads or writes the other's database tables.

---

## 3. Identity Architecture

Hub (Irno ID) is the source of truth for user identity. Meetino is a consumer.

**SSO flow (Phase 9.1):**
1. User clicks "ورود با حساب ایرنو" on Meetino login
2. Meetino redirects to Hub web: `GET /sso/meetino?redirect_uri=<meetino_callback>`
3. Hub authenticates user, generates a one-time SSO code (Redis, 60s TTL)
4. Hub redirects to: `<meetino_callback>?code=<code>`
5. Meetino callback page calls `POST /api/auth/irno/exchange { code }`
6. Meetino API exchanges code with Hub server-to-server (uses `IRNO_HUB_CLIENT_SECRET`)
7. Hub returns `IrnoIdentityClaims`, Meetino creates/updates local user, issues session

**Guest join is unchanged:** guests join via link + display name, no Hub account required, guests are not converted to Hub users.

**Hub role → Meetino role mapping:**
| Hub role | Meetino role |
|---|---|
| SUPER_ADMIN, ADMIN | ADMIN |
| TEACHER, MENTOR, ACCOUNTANT | HOST |
| STUDENT | STUDENT |
| GUEST, LEAD | STUDENT |

---

## 4. Database Ownership

Both apps share **one PostgreSQL container** in local dev (port 5433) but use **separate databases**:

| App | Database |
|---|---|
| Hub API | `irno_hub` |
| Meetino API | `meetino_db` |

Hub Prisma schema: `apps/hub-api/prisma/schema.prisma`
Meetino Prisma schema: `apps/meetino-api/src/prisma/schema.prisma`

Migrations are always run separately. Neither app ever touches the other's database.

---

## 5. Local Ports

| Service | Host Port | Notes |
|---|---|---|
| Hub Web | 3000 | Next.js dev server |
| Hub API | 4000 | NestJS, JWT auth |
| Meetino Web | 3001 | Next.js dev server |
| Meetino API | 4001 | NestJS, socket.io, LiveKit |
| PostgreSQL | 5433 | Docker container |
| Redis | 6380 | Docker container |
| LiveKit | 7880 | WebSocket signaling |
| LiveKit | 7881 | RTC TCP fallback |
| LiveKit | 7882/UDP | RTC media (preferred) |

---

## 6. Prerequisites

- Node.js 22+ (Hub), 20+ (Meetino)
- pnpm 9.15.4 (`npm install -g pnpm@9.15.4`)
- Docker Desktop (for PostgreSQL, Redis, LiveKit)

---

## 7. First-time Setup

```bash
# 1. Clone the repo
git clone <repo-url> irno-platform
cd irno-platform

# 2. Install all dependencies
pnpm install

# 3. Set up Hub environment
cp apps/hub-api/.env.example   apps/hub-api/.env
cp apps/hub-web/.env.example   apps/hub-web/.env.local
# Edit both files — replace placeholder secrets

# 4. Set up Meetino environment
cp apps/meetino-api/.env.example   apps/meetino-api/.env
cp apps/meetino-web/.env.example   apps/meetino-web/.env.local
# Edit both files — replace placeholder secrets

# 5. Start Docker infrastructure (PostgreSQL, Redis, LiveKit)
pnpm docker:dev:up

# 6. Run Hub database migrations + generate Prisma client
pnpm db:migrate:hub
pnpm --filter @irno/hub-api db:generate

# 7. Seed Hub database (creates SUPER_ADMIN account)
pnpm db:seed:hub

# 8. Run Meetino database migrations + generate Prisma client
pnpm db:migrate:meetino
pnpm --filter @irno/meetino-api prisma:generate

# Note on Prisma client generation:
# Hub and Meetino each have their own Prisma schema and generated client.
# After any schema migration, regenerate the client before building/running:
#   Hub:     pnpm --filter @irno/hub-api db:generate
#   Meetino: pnpm --filter @irno/meetino-api prisma:generate
# TypeScript build errors mentioning missing model delegates or enum values
# in hub-api usually indicate the Prisma client needs regeneration.
```

---

## 8. Running All Apps

```bash
# Start all 4 apps + watch mode
pnpm dev
```

This runs: hub-web (3000), hub-api (4000), meetino-web (3001), meetino-api (4001)

---

## 9. Running Hub Only

```bash
pnpm dev:hub
```

Starts hub-web and hub-api only. Requires Docker services to be running.

---

## 10. Running Meetino Only

```bash
pnpm dev:meetino
```

Starts meetino-web and meetino-api only. Requires Docker services (especially LiveKit) to be running.

---

## 11. Hub Migrations

```bash
# From repo root
pnpm db:migrate:hub           # prisma migrate deploy (production-style)
pnpm db:migrate:dev           # prisma migrate dev (create new migration)
pnpm db:seed:hub              # seed Hub database
pnpm db:studio                # Prisma Studio for Hub

# Or directly from the app
cd apps/hub-api
pnpm db:migrate:dev
pnpm db:seed
```

---

## 12. Meetino Migrations

```bash
# From repo root
pnpm db:migrate:meetino       # prisma migrate dev for Meetino

# Or directly from the app (Meetino uses --schema flag)
cd apps/meetino-api
pnpm prisma:migrate           # prisma migrate dev
pnpm prisma:generate          # regenerate Prisma client
pnpm prisma:deploy            # prisma migrate deploy (production)
pnpm prisma:reset             # reset and replay all migrations
pnpm prisma:studio            # Prisma Studio for Meetino
```

---

## 13. Building All Apps

```bash
pnpm build
```

---

## 14. Building Hub Only

```bash
pnpm build:hub
```

---

## 15. Building Meetino Only

```bash
pnpm build:meetino
```

---

## 16. Docker Image Build Commands

Build from the **repo root** (build context must be `/`):

```bash
# Hub
docker build -f apps/hub-web/Dockerfile     -t irno-hub-web:latest .
docker build -f apps/hub-api/Dockerfile     -t irno-hub-api:latest .

# Meetino
docker build -f apps/meetino-web/Dockerfile -t irno-meetino-web:latest .
docker build -f apps/meetino-api/Dockerfile -t irno-meetino-api:latest .

# Meetino web with custom URLs (baked at build time)
docker build -f apps/meetino-web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api.meet.irno.ir \
  --build-arg NEXT_PUBLIC_LIVEKIT_URL=wss://livekit.irno.ir \
  --build-arg NEXT_PUBLIC_IRNO_SSO_ENABLED=true \
  --build-arg NEXT_PUBLIC_IRNO_HUB_WEB_URL=https://hub.irno.ir \
  -t irno-meetino-web:latest .
```

---

## 17. Independent Deployment on Multiple Servers

Hub and Meetino are independently deployable. Recommended server layout:

| Server | Services | Docker images |
|---|---|---|
| Server 1 | Hub web + Hub API | irno-hub-web, irno-hub-api |
| Server 2 | Meetino web + Meetino API | irno-meetino-web, irno-meetino-api |
| Server 3 | LiveKit + coturn | livekit/livekit-server, coturn |
| Server 4 | PostgreSQL + Redis | postgres:16, redis:7 |

**Key production requirements:**
- Hub API needs `DATABASE_URL` pointing to Hub's database (`irno_hub`)
- Meetino API needs `DATABASE_URL` pointing to Meetino's database (`meetino_db`)
- Both apps share Redis (different key namespaces) or use separate Redis instances
- Meetino API needs `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` matching the LiveKit server config
- For SSO: Hub API needs `MEETINO_CLIENT_SECRET`; Meetino API needs matching `IRNO_HUB_CLIENT_SECRET`

**Run Hub migrations in production:**
```bash
docker run --rm \
  -e DATABASE_URL=postgresql://... \
  irno-hub-api:latest \
  node -e "require('child_process').execSync('npx prisma migrate deploy', {stdio:'inherit'})"
```

**Run Meetino migrations in production:**
```bash
docker run --rm \
  -e DATABASE_URL=postgresql://... \
  irno-meetino-api:latest \
  sh -c "cd /app/apps/meetino-api && node_modules/.bin/prisma migrate deploy --schema=src/prisma/schema.prisma"
```

---

## 18. Hub and Meetino Integration

**Two integration layers:**

1. **Irno ID / SSO (Phase 9.1)** — Identity handoff so Meetino users log in via Hub.
   - Flow described in section 3 above.
   - Hub env: `MEETINO_CLIENT_SECRET`, `MEETINO_ALLOWED_REDIRECT_URLS`
   - Meetino env: `IRNO_HUB_SSO_ENABLED=true`, `IRNO_HUB_API_URL`, `IRNO_HUB_CLIENT_SECRET`

2. **MeetinoMeetingReference (Phase 9)** — Hub records meeting links for course groups and events.
   - Hub stores: meetino meeting ID, join URL, host token expiry, attendance sync timestamps
   - Meetino stores: meeting runtime, participants, recordings
   - Sync: Hub API calls Meetino API to create meetings and fetch attendance (when `MEETINO_ENABLED=true`)
   - Manual fallback: admins can paste Meetino join links into Hub without API integration

---

## 19. CI Readiness

A minimal CI pipeline should run:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
```

For per-app CI:
```bash
pnpm typecheck:hub
pnpm typecheck:meetino
pnpm build:hub
pnpm build:meetino
```

---

## 20. Default Credentials (local dev only)

**Hub SUPER_ADMIN:**
```
Mobile:   09120000000
Email:    admin@irno.ir
Password: IrnoAdmin@2026
```

Run `pnpm db:seed:hub` to create this account after first migration.

---

## 21. TypeScript Version Note

- Hub apps use TypeScript 6.x (via root devDependencies)
- Meetino apps use TypeScript 5.x (via their own devDependencies)
- Both coexist in the same workspace without conflict — Turbo compiles them independently
