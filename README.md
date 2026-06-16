# Irno Hub

The central operating system of Irno Academy. Built as a monorepo with Next.js 16, NestJS 11, PostgreSQL, and Redis.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22 LTS | [nodejs.org](https://nodejs.org) |
| pnpm | 9.x | `npm install -g pnpm@9` |
| Docker | 24+ | [docker.com](https://docker.com) |
| Docker Compose | v2 | Bundled with Docker Desktop |

---

## First-time Setup

### 1. Clone and install

```bash
git clone <repo-url> irno-platform
cd irno-platform
pnpm install
```

### 2. Configure environment

```bash
cp .env.example apps/hub-api/.env
# Edit apps/hub-api/.env — adjust as needed for local dev
# Defaults work with the Docker Compose setup below
```

### 3. Start infrastructure

```bash
pnpm docker:up
# PostgreSQL → localhost:5432
# Redis      → localhost:6379
```

Wait ~10 seconds for services to be healthy:
```bash
pnpm docker:logs
# Look for: "database system is ready to accept connections"
# Look for: "Ready to accept connections"
```

### 4. Run database migration

```bash
pnpm db:migrate:dev
# Applies prisma/schema.prisma to your local PostgreSQL
# Creates tables: users, profiles, app_modules
```

### 5. Seed the database

```bash
pnpm db:seed
# Creates:
#   - SUPER_ADMIN user: 09120000000 / IrnoAdmin@2026
#   - AppModule records: Meetino (active), 4 × coming soon
```

⚠️ Change the default SUPER_ADMIN password before deploying to any non-local environment.

### 6. Start development servers

```bash
pnpm dev
# hub-web → http://localhost:3000
# hub-api → http://localhost:4000/api/v1
```

---

## Verify Everything Works

```bash
# 1. Liveness check (always 200)
curl http://localhost:4000/api/v1/health/live
# → {"status":"ok","timestamp":"..."}

# 2. Readiness check (PostgreSQL + Redis)
curl http://localhost:4000/api/v1/health/ready
# → {"status":"ok","info":{"postgres":{"status":"up"},"redis":{"status":"up"}},...}

# 3. Open the web UI
open http://localhost:3000
# → Redirects to /dashboard → shows app shell with sidebar
```

---

## Common Commands

```bash
# Development
pnpm dev                  # Start all apps in parallel
pnpm build                # Production build all packages and apps
pnpm typecheck            # TypeScript check across all packages
pnpm lint                 # Lint all packages
pnpm format               # Format all files with Prettier

# Database
pnpm db:migrate:dev       # Apply schema changes (development)
pnpm db:migrate           # Apply migrations (production/CI)
pnpm db:seed              # Seed initial data
pnpm db:studio            # Open Prisma Studio GUI

# Docker
pnpm docker:up            # Start PostgreSQL and Redis
pnpm docker:down          # Stop containers (data preserved)
pnpm docker:logs          # Stream container logs
pnpm docker:reset         # Stop containers AND wipe volumes (data lost)
```

---

## Project Structure

```
irno-platform/
├── apps/
│   ├── hub-web/            Next.js 16 — user interface
│   │   └── src/
│   │       ├── app/        App Router pages
│   │       └── components/ React components
│   └── hub-api/            NestJS 11 — REST API
│       ├── src/            Application source
│       └── prisma/         Schema and seed
├── packages/
│   ├── types/              Shared TypeScript types and enums
│   ├── validators/         Shared Zod validation schemas
│   ├── config/             Shared TypeScript config
│   ├── theme/              Design tokens and CSS variables
│   ├── i18n/               Persian translation strings
│   └── utils/              Pure utility functions
├── infra/
│   └── docker/             Docker Compose for local dev
├── turbo.json              Turborepo pipeline config
├── pnpm-workspace.yaml     pnpm workspace definition
└── .env.example            Environment variable template
```

---

## Environment Variables

All env vars are validated at API startup via Zod. Startup fails if any required variable is missing.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✓ | — | PostgreSQL connection string |
| `REDIS_HOST` | — | `localhost` | Redis host |
| `REDIS_PORT` | — | `6379` | Redis port |
| `REDIS_PASSWORD` | — | — | Redis password (if set) |
| `JWT_SECRET` | ✓ | — | Min 32 chars — used for token signing in Phase 2 |
| `JWT_ACCESS_EXPIRES_IN` | — | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | — | `7d` | Refresh token TTL |
| `API_PORT` | — | `4000` | API server port |
| `API_CORS_ORIGIN` | — | `http://localhost:3000` | Allowed CORS origin |
| `NEXT_PUBLIC_API_URL` | — | — | API URL for browser requests (hub-web) |

---

## Phase Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Done | Foundation — monorepo, DB, API health, web shell |
| 2 | ⏳ Next | Auth, JWT, roles, login, session management |
| 3 | — | Lead CRM, student profiles |
| 4 | — | Courses and cohorts |
| 5 | — | Enrollments and payments |
| 6 | — | Student timeline |
| 7 | — | Dashboard analytics |
| 8 | — | Meetino integration |
| 9 | — | Production deployment |

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend framework | Next.js | 16.2.6 |
| UI library | React | 19.2.6 |
| Styling | Tailwind CSS | 4.3.0 |
| Backend framework | NestJS | 11.1.24 |
| ORM | Prisma | 7.8.0 |
| Database | PostgreSQL | 16 |
| Cache / sessions | Redis | 7 |
| Validation | Zod | 4.4.3 |
| Language | TypeScript | 6.0.3 |
| Monorepo | Turborepo | 2.9.15 |
| Package manager | pnpm | 9.15.4 |
| Runtime | Node.js | 22 LTS |
