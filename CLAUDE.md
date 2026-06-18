# Irno Hub — Project Context and Architecture Introduction

---

## CRITICAL RULES — READ BEFORE ANY MIGRATION WORK

### Migration Safety Rules (P3018 prevention)

Every new Prisma migration SQL in this project that adds columns or indexes MUST be idempotent:

```sql
-- ALWAYS:
ALTER TABLE "t" ADD COLUMN IF NOT EXISTS "col" TYPE;
CREATE INDEX IF NOT EXISTS "name" ON "table"("col");
CREATE UNIQUE INDEX IF NOT EXISTS "name" ON "table"("col");
```

**The P3018 fix pattern (shadow DB timestamp conflict):**
1. Check `prisma migrate status` — find the failed migration name
2. If migration is NOT in failed state but shadow DB fails: edit the two conflicting SQL files so table-creation migrations run before ALTER statements
3. Then `npx prisma migrate reset` (drops and replays all migrations cleanly)
4. Run `pnpm db:seed` after reset

**Migration timestamp ordering rule:** If migration A alters tables created by migration B, migration A's timestamp MUST be later than B's. Never create a migration that ALTERs tables before their CREATE migration runs.

### Migration commands

```bash
# From apps/hub-api/
pnpm db:migrate:dev   # prisma migrate dev
pnpm db:generate      # prisma generate
pnpm db:seed          # seed the database
```

Prisma 7 reads connection URL from `apps/hub-api/prisma.config.ts`, not from `datasource url = env(...)`.

---

## 1. Product Context

Irno is not just a course website or a simple academy admin panel.

Irno is an educational technology ecosystem in Iran focused on:

* web development education
* AI education
* language learning
* digital skills
* mentor-supported learning
* project-based learning
* online classes
* future coworking/community spaces

Irno Academy teaches practical, modern, project-based courses. Students should not only attend classes; they should build real projects, receive mentor feedback, attend online sessions, communicate with teachers, and have a visible learning journey.

Irno Hub is the central operating system of Irno.

It should manage students, staff, courses, course groups, enrollments, payments, events, notifications, sessions, communication, app access, and analytics.

Irno Hub must feel like a premium internal platform for a serious modern academy, not a generic admin template.

---

## 2. Existing Product: Meetino

Meetino is already built and deployed as one Irno app.

Meetino is a self-hosted real-time meeting/classroom platform for Irno.

Meetino currently includes or is designed to include:

* user auth
* guest join by meeting link
* meeting creation
* pre-join page
* LiveKit video/audio
* chat
* realtime participants
* host controls
* meeting lock/end/kick
* local client-side recording
* meeting reports
* attendance
* rejoin approval
* whiteboard
* file sharing
* virtual background
* Persian RTL UI
* light/dark mode
* production deployment on VPS

Meetino should not remain isolated forever.

Irno Hub should later integrate with Meetino so that:

* admins can create meetings from Hub
* teachers can create class sessions from Hub
* students can see upcoming meetings
* meeting attendance can sync back to student profiles
* meeting reports can appear in student timelines
* Meetino becomes one app inside the Irno platform

For now, do not rewrite Meetino. Design Irno Hub so it can connect to Meetino cleanly later.

---

## 3. Main Goal of Irno Hub

Irno Hub should answer these business questions:

* Who are our students?
* Which course is each student enrolled in?
* What is each student’s payment status?
* Who has unpaid installments?
* Which students need follow-up?
* Which courses and course groups are active?
* Which teacher or mentor is responsible for each course group?
* What sessions are scheduled?
* Which meetings happened?
* Who attended?
* What is the learning journey of each student?
* How many students registered this month?
* How much revenue is recorded?
* What apps does each role have access to?

Irno Hub should become the main dashboard for running Irno Academy.

---

## 4. Core Product Modules

Irno Hub should include these modules:

### 4.1 Identity and Access

Central user identity for all Irno apps.

Roles:

* SUPER_ADMIN
* ADMIN
* ACCOUNTANT
* TEACHER
* MENTOR
* STUDENT
* GUEST
* LEAD

Requirements:

* central user profile
* role-based permissions
* account status
* staff/student distinction
* future SSO readiness for Meetino and other apps

---

### 4.2 Applicant CRM

Manage applicants (متقاضیان) — people interested in registering for a course but not yet confirmed students.

Applicant lifecycle:

* NEW_APPLICANT
* CONTACTED
* CONSULTED
* READY_TO_REGISTER
* REGISTERED
* NEEDS_FOLLOW_UP
* NOT_INTERESTED
* CANCELLED

Track:

* full name
* mobile
* email
* city
* applicant source
* interested course
* consultation notes
* follow-up date
* assigned staff
* internal notes

Applicant sources:

* Instagram
* referral
* website
* phone call
* Telegram/WhatsApp
* in-person
* other

---

### 4.3 Courses and Course Groups

Course means the general educational product.

Examples:

* HTML/CSS/JS/React private course
* React Native with Expo
* Next.js course
* AI course
* language course

CourseGroup (گروه / گروه آموزشی) means a specific running group/class of a course.

Examples:

* React Group A (گروه A ری‌اکت)
* Next.js Summer Group (گروه تابستان نکست)
* React Native Private Group (گروه خصوصی ری‌اکت نیتیو)

A CourseGroup should include:

* course
* teacher
* mentors
* students
* start date
* end date
* schedule
* capacity
* status
* related Meetino meetings later
* related chat group later
* related assignments/projects later

**Naming rules:**
* Backend/code/DB: `CourseGroup`, `CourseGroupStatus`, `CourseGroupMentor`, `courseGroupId`, `CourseGroupsModule`
* Frontend Persian UI: "گروه" / "گروه آموزشی" (never "کوهورت" or "Cohort")
* Sidebar label: "گروه‌ها"
* Routes — frontend: `/groups`, `/groups/new`, `/groups/[id]`
* Routes — backend: `/api/v1/groups`, `/api/v1/groups/:id`, `/api/v1/groups/:id/mentors`

---

### 4.4 Enrollment

Enrollment connects a student to a course/course group.

Track:

* student
* course
* course group (CourseGroup)
* enrollment date
* enrollment status
* tuition amount
* discount
* final payable amount
* payment plan
* notes

Enrollment statuses:

* PENDING
* ACTIVE
* PAUSED
* COMPLETED
* CANCELLED

---

### 4.5 Finance and Payments

For MVP, payments are manually recorded by staff/admin/accountant.

Do not implement online payment gateway in MVP.

Track:

* total tuition
* discount
* final amount
* paid amount
* remaining amount
* installments
* due dates
* payment receipts
* payment method
* payment notes
* payment status

Payment statuses:

* UNPAID
* PARTIALLY_PAID
* PAID
* OVERDUE
* REFUNDED
* FREE

Important technical rule:

* Store money as integers.
* Use one consistent unit.
* For Irno MVP, use amountToman as integer unless another unit is explicitly chosen and documented.
* Do not use floating point values for money.

---

### 4.6 Student Timeline

Every important event about a student should appear in a timeline.

Examples:

* lead created
* contacted
* registered
* enrolled in course
* payment recorded
* installment overdue
* joined course group
* attended Meetino session
* missed session
* mentor note added
* project submitted
* course completed

Timeline makes Irno Hub special.

It gives every student a living educational and financial history.

---

### 4.7 App Launcher

Irno Hub should be the entry point to all Irno apps.

Initial apps:

* Meetino
* Irno Chat
* Irno Learn
* Irno Projects
* Irno AI
* Irno Events
* Admin

Only Meetino may be active now. Other apps shown as “coming soon” placeholders.

AppModule seed keys (all registered in DB):
* `MEETINO` — active
* `IRNO_CHAT` — coming soon
* `IRNO_LEARN` — coming soon
* `IRNO_PROJECTS` — coming soon
* `IRNO_AI` — coming soon
* `IRNO_EVENTS` — coming soon (Phase 8)
* `IRNO_NOTIFICATIONS` — internal/future (Phase 7)
* `IRNO_SKILLS` — coming soon (Phase 9+)

---

### 4.8 Dashboard Analytics

Irno Hub dashboard should show useful operational analytics:

* active students
* new applicants this month
* new enrollments this month
* active course groups
* total recorded revenue
* unpaid balances
* overdue installments
* students needing follow-up
* today’s sessions
* recent Meetino meetings
* recent payments
* recent timeline events

The dashboard should help the Irno team understand the business, not just show decorative cards.

---

## 5. Design Requirements

Irno Hub UI should be:

* Persian
* RTL
* modern
* clean
* premium
* educational
* practical
* responsive
* light/dark mode ready
* consistent with Meetino branding but more platform/admin oriented

Do not make it look like a raw admin template.

It should feel like a custom operating system for Irno.

Design direction:

* clean cards
* strong hierarchy
* useful empty states
* polished tables
* powerful search and filters
* professional forms
* timeline views
* student profile pages
* meaningful dashboards

---

## 6. Technical Direction

Recommended stack:

* Next.js 16 for Hub web
* NestJS for Hub API
* PostgreSQL
* Prisma
* Redis
* pnpm
* Turborepo
* TypeScript
* Tailwind CSS
* Persian RTL
* light/dark mode
* JWT/session auth depending on final architecture

Recommended monorepo structure:

irno-platform/
apps/
hub-web/
hub-api/
packages/
types/
validators/
ui-web/
theme/
i18n/
api-client/
config/
utils/

Later, this platform may also include:

apps/
meetino-web/
meetino-api/
mobile/
chat-web/
learn-web/

But do not move Meetino into this repo immediately unless explicitly requested.

---

## 7. Senior Engineering Rules

Follow these rules:

1. Do not over-engineer the MVP.
2. Do not build a generic admin panel.
3. Use domain-driven module boundaries.
4. Prefer feature/domain-based structure over random technical folders.
5. Keep shared packages useful but not premature.
6. Do not create abstractions before there is a real need.
7. Keep business rules on the backend.
8. Do not trust frontend role or permission data.
9. Use validation for all inputs.
10. Add database indexes for common queries.
11. Use soft delete where appropriate for business records.
12. Keep auditability in mind.
13. Keep financial data accurate.
14. Store money as integers.
15. Keep dates/timezones consistent.
16. Store timestamps in UTC.
17. Display dates in Persian-friendly format later.
18. Keep UI user-facing text Persian.
19. Keep code names, routes, enums, and DB fields English.
20. Avoid unnecessary React state when derived values can be calculated directly.
21. Forms should be reliable and simple.
22. Tables should support search/filter/pagination when needed.
23. Do not add payment gateway in MVP.
24. Do not add full LMS in MVP.
25. Do not add chat in MVP.
26. Design with future Meetino integration in mind.
27. No module should send SMS/email/Telegram directly — all notifications must route through the central Notifications module.
28. Event management (webinars, workshops, conferences) belongs to Irno Events, not Meetino. Meetino is the online delivery layer only.
29. Skills and Credits are internal Irno records — do not expose outside the platform without explicit design.

---

## 8. MVP Scope

Irno Hub MVP should include:

1. Authentication and roles
2. User/staff/student management
3. Applicant CRM (متقاضیان)
4. Course management
5. Course Group management (گروه‌های آموزشی)
6. Enrollment management
7. Manual payment tracking
8. Installments and due dates
9. Student profile
10. Student timeline
11. Dashboard analytics
12. App launcher
13. Meetino integration placeholders

MVP should not include:

* online payment gateway
* full LMS content system
* full chat app
* mobile app
* advanced AI features
* public student self-registration
* automated SMS/email campaigns
* complex accounting system

---

## 9. First Development Principle

Before writing code, first design:

1. product modules
2. user flows
3. database model
4. roles and permissions
5. monorepo structure
6. API boundaries
7. frontend route structure
8. MVP phases

Do not start coding before architecture is confirmed.

---

## 10. Future Modules — Architecture Notes

> These modules are NOT in the MVP scope. Do not implement any tables, endpoints, or pages for them until explicitly instructed. Documented here for architectural awareness only.

---

### 10.1 Irno Events

**Business meaning:**
Irno Events manages educational and community events including webinars, conferences, workshops, free discussions, group consultations, open learning sessions, competitions, and in-person or hybrid events.

**Critical distinction:**
- Irno Events owns event definition, registration, eligibility, capacity, payment, reminders, participant lists, and reports.
- Meetino is the online delivery layer — used to host online events. Irno Events creates and manages the event; Meetino hosts the video session.
- Webinar management belongs to Irno Events. Online video delivery belongs to Meetino.

**Future data concepts:**
- `Event` — event definition (title, description, type, deliveryMode, registrationMode, startAt, capacity, price)
- `EventRegistration` — a user registering for an event
- `EventParticipant` — confirmed participant with attendance tracking
- `EventTicket` / `EventPrice` — pricing tiers if needed
- `EventEligibilityRule` — rules restricting who can register
- `EventReminder` — scheduled notification before event
- `EventAttendance` — post-event attendance record
- `EventReport` — summary of attendance and participation

**Event types (future enum `EventType`):**
`WEBINAR`, `CONFERENCE`, `FREE_DISCUSSION`, `WORKSHOP`, `GROUP_CONSULTATION`, `OPEN_SESSION`, `CHALLENGE`

**Delivery modes (future enum `DeliveryMode`):**
`ONLINE`, `IN_PERSON`, `HYBRID`

**Registration modes (future enum `RegistrationMode`):**
`FREE`, `PAID`, `INVITE_ONLY`, `INTERNAL_ONLY`

**Eligibility rule examples:**
- only ACTIVE students
- only students from a specific course or course group
- only students who completed a course
- only students with a specific skill/credit
- only students with no overdue payments
- open to public (applicants and guests)

**AppModule key:** `IRNO_EVENTS` (Phase 8)

---

### 10.2 Skills & Credits

**Business meaning:**
Skills & Credits represent what a student has earned or demonstrated inside Irno Academy. They are internal records, not public credentials.

**Examples:**
- completed React course
- passed an internal test
- earned a certificate
- approved by mentor as interview-ready
- has `react-basics` credit
- has `speaking-B1` credit
- is marked `interview-ready`

**Future use cases:**
- gate event registration by skill
- gate advanced course access by prerequisite skill
- generate company hiring recommendations
- student ranking and profiles
- digital certificates

**Architecture note:** Skills are awarded by staff/mentor actions or automatic course completion events. They are never self-assigned by students.

**AppModule key:** `IRNO_SKILLS` (Phase 9+)

---

### 10.3 Notifications

**Business meaning:**
Notifications is the central communication layer for all Irno modules. No module sends SMS, email, or Telegram directly. All notification requests go through this module.

**Supported channels (phased):**
- In-app notifications (Phase 7)
- SMS (Phase 7)
- Email (later)
- Telegram bot (later)

**Notification types (future enum `NotificationType`):**
`TRANSACTIONAL`, `MARKETING`, `REMINDER`, `SYSTEM`

**Examples:**
- event reminder 24 hours before
- webinar link delivery
- payment due reminder
- installment overdue notice
- course start announcement
- registration confirmation
- new course marketing campaign

**Architecture rule — enforced from Phase 7 onward:**
Events, Finance, Meetino, Learn, and all other modules MUST request notifications through the Notifications module. Direct SMS/email calls in service code are forbidden.

**AppModule key:** `IRNO_NOTIFICATIONS` (internal, Phase 7)

---

## 11. Product Roadmap

Phases are sequential. Do not start a phase without explicit instruction.

| Phase | Name | Status |
|-------|------|--------|
| Phase 1 | Foundation — monorepo, infra, shared packages | ✅ Complete |
| Phase 2 | Auth & Users — JWT, roles, user management | ✅ Complete |
| Phase 3 | Applicant & Student CRM | ✅ Complete |
| Phase 4 | Courses & Course Groups | ✅ Complete |
| Phase 5 | Enrollment & Finance | ✅ Complete |
| Phase 6 | Student Timeline & Analytics | ✅ Complete |
| Phase 7 | Notifications Foundation | ✅ Complete |
| Phase 8 | Irno Events Module | ✅ Complete |
| Phase 9 | Meetino Integration | ✅ Complete |
| Phase 9.1 | Irno ID and Meetino Identity Alignment | ✅ Complete (verified) |
| Phase 9.2 | Irno ID Hosted UI, Public Registration, Auth Client | ✅ Complete |
| Phase 10 | Production Deployment & Hardening | 🔲 Pending |
| Phase 11 | Student & Applicant Portal | ✅ Complete |
| Phase 11.1 | OTP-Based Irno ID Login & Student Account Activation | ✅ Complete |
| Phase 11.2 | Notification Provider Independence & OTP Delivery Cleanup | ✅ Complete |
| Phase 11.3 | Irno ID Password Management | ✅ Complete |
| Phase 12 | Skills & Credits | ✅ Complete |
| Phase 12.1 | Master Data, Taxonomy, and Admin UX Cleanup | ✅ Complete |
| Phase 13 | Certificates & Verifiable Credentials | ✅ Complete |
| Phase 14 | Irno Career Studio — Foundation | ✅ Complete |
| Phase 15 | Irno CV Deep Resume Editor | ✅ Complete |
| Phase 15.1 | Resume Editor Runtime QA, Bug Fixes & Premium UX | ✅ Complete |
| Phase 16 | Resume Checker Advanced | ✅ Complete |
| Phase 16.1 | Resume Checker Parser Accuracy & Job Match Payload Fix | ⚠️ Not Accepted — Tech Debt |
| Phase 17 | Career Studio Public Product App & Landing | ✅ Complete |
| Phase 18 | Resume Checker Parser Hardening & Job Match Runtime Fix | ✅ Complete |
| Phase 18.1 | Resume Checker Scoring Quality & Auth-Aware Public Shell | ✅ Complete |
| Phase 18.2 | Auth Redirect Priority Fix — Career Studio + Meetino | ✅ Complete |
| Phase 19 | Public Live Resume & Portfolio Deep Experience | ✅ Complete |
| Phase 20 | Export & PDF Production Hardening | ✅ Complete |
| Phase 20.1 | Real Server-Side PDF Export (Playwright) | ✅ Complete |
| Phase 20.2 | PDF Export Concurrency Guard | ✅ Complete |
| Phase 18.3 | Job Match External Resume Support | ✅ Complete |
| Phase 21 | Portfolio Case Study Builder | ✅ Complete |
| Phase 22 | Security Hardening, Abuse Control, Production Safety | ✅ Complete |

**Phase 6 scope (when instructed):**
- Enrich student timeline with all Phase 5 events (enrollment, payment, installment)
- Timeline UI improvements (filters, event types, icons)
- Analytics dashboard: month-over-month enrollments, revenue charts, cohort stats
- Overdue installment background job or scheduled check
- Student progress summary

**Phase 7 scope (when instructed):**
- Notifications module in hub-api
- In-app notification model + API
- SMS integration (single provider, no abstraction yet)
- Payment due and installment overdue reminders
- All other modules route through Notifications

**Phase 8 scope (when instructed):**
- Irno Events module in hub-api
- Event CRUD, registration, eligibility rules
- Meetino link attachment for ONLINE events
- Event participant list and attendance
- Event pages in hub-web

**Phase 9 scope (when instructed):**
- Meetino API integration from hub-api
- Create Meetino meetings from Hub
- Sync meeting attendance back to student timeline
- Meeting reports in Hub

**Phase 10 scope (when instructed):**
- Production environment setup
- Security hardening (rate limiting, audit logs)
- Performance optimisation (caching, indexes review)
- Monitoring and alerting

---


## 12. Implementation Progress — Current State (2026-06-12)

### Stack Versions (actual, locked in pnpm-lock.yaml)

* Node: 22.x
* pnpm: 9.15.4
* Turborepo: 2.9.15
* Next.js: 16.2.6 (App Router, Turbopack)
* NestJS: 11.1.24
* Prisma: 7.8.0
* TypeScript: 6.0.3 (all apps)

---

### Monorepo Structure (implemented)

```
irno-platform/
  apps/
    hub-web/          — Next.js 16 frontend (Persian RTL, Tailwind)
    hub-api/          — NestJS 11 backend (REST API, JWT auth)
  packages/
    types/            — Shared TypeScript types and enums
    validators/       — Shared Zod/class-validator schemas
    ui-web/           — Shared React components (Tailwind)
    theme/            — Design tokens
    i18n/             — Persian translation strings
    api-client/       — Typed fetch client for hub-web → hub-api
    config/           — Shared ESLint/TS config
    utils/            — Shared utilities
  infra/              — Docker Compose (postgres:5433, redis:6379)
```

---

### Infrastructure

* PostgreSQL running on port **5433** (not 5432 — avoid conflict with local installs)
* Redis running on host port **6380**, mapped to internal 6379 inside Docker
* Docker Compose file: `infra/docker/docker-compose.yml`
* Start: `cd infra && docker compose up -d`

---

### Environment Files

* `apps/hub-api/.env` — DATABASE_URL, REDIS_URL, JWT_SECRET, etc.
* `apps/hub-web/.env.local` — NEXT_PUBLIC_API_URL=http://localhost:3001
* Prisma 7 does NOT accept `url = env("DATABASE_URL")` in schema datasource block.
  Connection URL is read from `apps/hub-api/prisma.config.ts` instead.

---

### Seed / Default Credentials

```
Mobile:   09120000000
Email:    admin@irno.ir
Password: IrnoAdmin@2026
Role:     SUPER_ADMIN
```

Run seed: `cd apps/hub-api && pnpm db:seed`

---

### Critical Next.js 16 Notes

* **Do NOT create `src/middleware.ts`** — Next.js 16 uses `proxy.ts` convention.
  Having both `middleware.ts` and `proxy.ts` causes a fatal conflict:
  _"Both middleware file and proxy file are detected. Please use proxy only."_
* Auth redirect logic lives in `apps/hub-web/src/proxy.ts` (exported as `proxy` + `config`).
* Public routes (no auth required): `/login`
* Protected routes: everything else redirects to `/login` if no valid JWT cookie.

---

### Critical NestJS / Prisma Notes

* **Prisma 7**: Remove `datasourceUrl` from `new PrismaClient({...})` — it's been removed.
  URL comes from env automatically via `prisma.config.ts`.
* **DTO imports**: Always use value imports (not `import type`) in NestJS DTOs.
  `import type` is erased at runtime — `ValidationPipe` breaks silently.
* **Global guards**: `JwtAuthGuard` + `RolesGuard` registered as `APP_GUARD` in `app.module.ts`.
  Every endpoint is protected by default. Use `@Public()` decorator to opt out.
* **Money**: Always store as integer Toman. No floats anywhere.

---

### Completed Phases

#### Phase 1 — Foundation ✅
* Monorepo scaffolded (Turborepo + pnpm workspaces)
* hub-api: NestJS app with health endpoint, Prisma service, Redis service
* hub-web: Next.js 16 app with Tailwind, RTL layout, Persian font
* Shared packages wired up
* Docker Compose for postgres + redis
* Migration: `20260528002638_init` — creates `users`, `profiles`, `app_modules` tables

#### Phase 2 — Auth & Users ✅
* JWT auth (login endpoint, token cookie)
* `JwtAuthGuard` + `RolesGuard` as global APP_GUARD
* `@Public()` decorator to bypass auth
* `@Roles(...)` decorator for role-based access
* `UsersModule`: CRUD for users and profiles (admin-only)
* hub-web: `/login` page, auth context, session management
* hub-web: `/users` page (user list + create form)
* hub-web: `/dashboard` page (placeholder analytics)

#### Phase 3 — Applicants and Students CRM ✅
* Migration 1: `20260529002125_phase3_crm` — creates initial CRM tables
* Migration 2: `20260529010000_rename_lead_to_applicant` — renames all Lead → Applicant:
  - Tables: `leads` → `applicants`, `lead_notes` → `applicant_notes`
  - Enums: `LeadStatus` → `ApplicantStatus`, `LeadSource` → `ApplicantSource`
  - ApplicantStatus values: NEW_APPLICANT, CONTACTED, CONSULTED, READY_TO_REGISTER, REGISTERED, NEEDS_FOLLOW_UP, NOT_INTERESTED, CANCELLED
  - Column: `originLeadId` → `originApplicantId` in students table
* hub-api `ApplicantsModule`:
  - `GET /api/v1/applicants` (paginated, filterable by status/source/assignedTo)
  - `POST /api/v1/applicants`
  - `GET /api/v1/applicants/:id`
  - `PATCH /api/v1/applicants/:id`
  - `DELETE /api/v1/applicants/:id` (soft delete)
  - `POST /api/v1/applicants/:id/notes`
  - `GET /api/v1/applicants/:id/notes`
  - `PATCH /api/v1/applicants/:id/assign`
  - `POST /api/v1/applicants/:id/convert` (convert applicant → student)
* hub-api `StudentsModule`:
  - `GET /api/v1/students` (paginated)
  - `POST /api/v1/students`
  - `GET /api/v1/students/:id`
  - `PATCH /api/v1/students/:id`
  - `POST /api/v1/students/:id/notes`
  - `GET /api/v1/students/:id/timeline`
* Student code format: `IRN-YYYY-NNNN` (e.g. `IRN-2026-0001`)
* Timeline auto-written on: student creation, status change
* hub-web pages:
  - `/applicants` — applicant list with filters (متقاضیان)
  - `/applicants/new` — create applicant form
  - `/applicants/[id]` — applicant detail + notes + convert action
  - `/students` — student list
  - `/students/new` — create student form
  - `/students/[id]` — student profile + timeline

#### Phase 4 — Courses and Course Groups ✅
* Migration: `20260530000000_phase4_courses` — creates `courses`, `course_groups`, `course_group_mentors` tables and adds `interestedCourseId` FK to `applicants`
* Run migration: `cd apps/hub-api && pnpm db:migrate:dev`
* **Must run after migrate**: `pnpm db:generate` to regenerate Prisma client (sandbox requires manual patch; production machine runs normally)
* New enums: `CourseStatus` (DRAFT, ACTIVE, ARCHIVED), `CourseLevel` (BEGINNER, INTERMEDIATE, ADVANCED, ALL_LEVELS), `CourseGroupStatus` (UPCOMING, ACTIVE, COMPLETED, CANCELLED)
* Added `interestedCourseId` (optional FK → courses) to `applicants` table
* hub-api `CoursesModule`:
  - `GET /api/v1/courses` — paginated, filterable by search/status/level/category; all staff roles
  - `POST /api/v1/courses` — SUPER_ADMIN, ADMIN only
  - `GET /api/v1/courses/:id`
  - `PATCH /api/v1/courses/:id` — SUPER_ADMIN, ADMIN only
  - `DELETE /api/v1/courses/:id` — soft delete; archives instead if active/upcoming groups exist
* hub-api `CourseGroupsModule`:
  - `GET /api/v1/groups/mine` — TEACHER gets own groups, MENTOR gets assigned groups (declared BEFORE `:id` to avoid route conflict)
  - `GET /api/v1/groups` — paginated; TEACHER scoped to own, MENTOR scoped to assigned, ADMIN/SUPER_ADMIN sees all
  - `POST /api/v1/groups` — SUPER_ADMIN, ADMIN only
  - `GET /api/v1/groups/:id` — access-checked for TEACHER/MENTOR
  - `PATCH /api/v1/groups/:id` — SUPER_ADMIN, ADMIN only
  - `DELETE /api/v1/groups/:id` — cancels if UPCOMING/ACTIVE; soft deletes otherwise
  - `POST /api/v1/groups/:id/mentors` — body: `{ userId }` — validates MENTOR role, rejects duplicates
  - `DELETE /api/v1/groups/:id/mentors/:userId` — removes mentor assignment
* Role validation: `assertTeacherRole()` and `assertMentorRole()` helpers in CourseGroupsService
* hub-web pages:
  - `/courses` — list with search, status filter, level filter, paginated table
  - `/courses/new` — create form with auto-slug generation from title
  - `/courses/[id]` — detail page + related groups list + edit/delete via `course-actions.tsx`
  - `/groups` — list with search, courseId filter, status filter
  - `/groups/new` — create form with course dropdown, teacher dropdown, mentor toggle-picker; assigns mentors after group creation
  - `/groups/[id]` — detail with info cards, placeholder tabs (دانشجویان, پرداخت‌ها, جلسات میتینو), edit/mentor-sync/delete via `group-actions.tsx`
* Dashboard: live KPI cards for total courses and groups (fetched server-side via Promise.allSettled); quick links; phase status panel
* Sidebar `CURRENT_PHASE` updated to 4 — دوره‌ها and گروه‌ها now clickable (updated to 5 in Phase 5)
* Applicant create/edit forms: `interestedCourseId` dropdown (loads active courses on mount)
* Applicant detail page: shows "دوره مورد علاقه" field
* Student profile: shows "علاقه‌مندی ثبت‌شده" section (interestedCourseName, interestedTopic) as interest, not enrollment
* `@irno/types`: added `CourseDto`, `PaginatedCourses`, `CourseGroupDto`, `CourseGroupMentorDto`, `PaginatedCourseGroups`; `CourseLevel`, `CourseStatus`, `CourseGroupStatus` enums; `interestedCourseId`/`interestedCourseName` added to `ApplicantDto`; `CourseDto.category` typed as `string | null`
* `@irno/validators`: `createCourseSchema`, `updateCourseSchema`, `createCourseGroupSchema`, `updateCourseGroupSchema`, `assignMentorSchema`
* `@irno/i18n`: `fa.courses`, `fa.courseStatus`, `fa.courseLevel`, `fa.groups`, `fa.courseGroupStatus` sections added; `nav.groups` updated
* TypeScript: zero errors on both `hub-api` and `hub-web` (`npx tsc --noEmit`)
* `interestedCourseGroupId` on Applicant intentionally deferred to Phase 5
* Dead code: `apps/hub-api/src/leads/` and `apps/hub-web/src/app/(app)/leads/` are inert stubs. Safe to delete: `rm -rf apps/hub-api/src/leads apps/hub-web/src/app/\(app\)/leads`

---

#### Phase 5 — Enrollment and Payments ✅

* Migration: `20260603000000_phase5_finance` — creates `enrollments`, `payments`, `payment_transactions`, `installments` tables; Phase 5 enums; `interestedCourseGroupId` on `applicants`
* Run migration: `cd apps/hub-api && pnpm db:migrate:dev`
* **After migrate on production machine**: `pnpm db:generate` (sandbox requires manual Prisma client patch)
* **Prisma client patch** (sandbox): patched `.prisma/client/index.d.ts` to add `EnrollmentDelegate`, `PaymentDelegate`, `PaymentTransactionDelegate`, `InstallmentDelegate` stub interfaces + Phase 5 enums
* TypeScript: zero errors on both `hub-api` and `hub-web` ✅
* New enums: `EnrollmentStatus`, `PaymentStatus`, `PaymentMethod`, `InstallmentStatus`
* `TimelineEventType` extended: `ENROLLMENT_CREATED`, `ENROLLMENT_STATUS_CHANGED`, `PAYMENT_RECORDED`, `PAYMENT_COMPLETED`, `INSTALLMENT_CREATED`, `INSTALLMENT_OVERDUE`, `INSTALLMENT_PAID`
* `@irno/types`: added `EnrollmentDto`, `PaginatedEnrollments`, `PaymentDto`, `PaginatedPayments`, `PaymentTransactionDto`, `InstallmentDto`, `FinanceSummaryDto`; `StudentDto` extended with `interestedCourseGroupId`/`interestedCourseGroupName`
* `@irno/validators`: `createEnrollmentSchema`, `updateEnrollmentSchema`, `recordTransactionSchema`, `createInstallmentsSchema`
* `@irno/i18n`: `fa.enrollments`, `fa.enrollmentStatus`, `fa.payments`, `fa.paymentStatus`, `fa.paymentMethod`, `fa.installmentStatus`
* hub-api `EnrollmentsModule`:
  - `GET /api/v1/enrollments` (paginated, filter by studentId/courseId/courseGroupId/status)
  - `POST /api/v1/enrollments` (transactional: creates Enrollment + Payment atomically + timeline event)
  - `GET /api/v1/enrollments/:id`
  - `PATCH /api/v1/enrollments/:id` (blocks money edits if transactions exist)
  - Validates: student/course exist, group belongs to course, no duplicate active enrollment for same group
* hub-api `PaymentsModule`:
  - `GET /api/v1/payments/finance-summary` (SUPER_ADMIN/ADMIN/ACCOUNTANT only — declared BEFORE `:id`)
  - `GET /api/v1/payments/installments` (global installment list with overdue filter)
  - `PATCH /api/v1/payments/installments/:id/status` (WAIVED only; PAID requires transaction)
  - `GET /api/v1/payments` (filter by status/studentId/overdue)
  - `GET /api/v1/payments/:id`
  - `POST /api/v1/payments/:id/transactions` (validates overpayment, updates payment status, timeline)
  - `GET /api/v1/payments/:id/transactions`
  - `POST /api/v1/payments/:id/installments` (bulk create, validates no duplicates)
  - `GET /api/v1/payments/:id/installments`
* hub-web pages:
  - `/enrollments` — list with status/course/group filters
  - `/enrollments/new` — create form (student/course/group dropdowns, tuition/discount/final calc)
  - `/enrollments/[id]` — detail + payment summary link
  - `/payments` — list with finance summary cards
  - `/payments/[id]` — detail with transactions + installments
  - `/payments/[id]/payment-actions.tsx` — record payment modal, create installments modal
* Sidebar `CURRENT_PHASE` updated to 5 — ثبت‌نام‌ها and پرداخت‌ها now clickable
* Dashboard: finance summary cards (مجموع درآمد، مجموع مانده، اقساط معوق، ثبت‌نام‌های فعال) visible only to SUPER_ADMIN/ADMIN/ACCOUNTANT
* Student profile `/students/[id]`: ثبت‌نام‌ها tab shows real enrollments; پرداخت‌ها tab role-gated to SUPER_ADMIN/ADMIN/ACCOUNTANT
* `students.service.ts`: include `interestedCourseGroup` in originApplicant select; map `interestedCourseGroupId`/`interestedCourseGroupName` in DTO

**Known limitations (intentional for MVP)**:
* Overdue installment status computed on-read — no background job
* Installment PAID status cannot be set directly — requires a payment transaction
* No overpayment allowed (backend rejects)
* No money edits after transactions exist (backend blocks)
* No installment edit/delete — only WAIVED allowed
* `/applicants/[id]` does not yet display "گروه مورد علاقه" row (stored, not shown)

#### Phase 6 — Student Timeline & Analytics ✅

* No new Prisma migration needed — StudentTimelineEvent model already existed
* New enums added to `TimelineEventType`: `INSTALLMENT_WAIVED`, `SYSTEM_NOTE`
* TypeScript: zero errors on both `hub-api` and `hub-web` ✅
* Bug fix: `/enrollments/new` client-side fetch was incorrectly reading `d.data` instead of `d.data.data` for paginated responses (ResponseInterceptor double-wraps); fixed for students, courses, and groups fetches. Also fixed student name mapping from `user.profile.firstName` → `fullName` field on DTO.
* hub-api `ReportsModule` (`src/reports/`):
  - `GET /api/v1/reports/students/needs-follow-up` — SUPER_ADMIN, ADMIN
  - `GET /api/v1/reports/finance/overdue-installments` — SUPER_ADMIN, ADMIN, ACCOUNTANT
  - `GET /api/v1/reports/finance/balances` — SUPER_ADMIN, ADMIN, ACCOUNTANT
  - `GET /api/v1/reports/enrollments/summary` — SUPER_ADMIN, ADMIN
  - `GET /api/v1/reports/crm/summary` — SUPER_ADMIN, ADMIN
* Improved `GET /api/v1/students/:id/timeline` — now accepts `eventType`, `fromDate`, `toDate` filters + pagination
* `@irno/types`: added `NeedsFollowUpItemDto`, `OverdueInstallmentItemDto`, `FinanceBalancesDto`, `EnrollmentSummaryDto`, `CrmSummaryDto` in `report.ts`
* `@irno/i18n`: added `nav.reports`, `fa.reports`, `fa.timeline` sections
* hub-web pages:
  - `/reports` — landing with 5 report cards (role-gated)
  - `/reports/follow-ups` — applicants needing follow-up table
  - `/reports/overdue-installments` — overdue installments with days-overdue badge
  - `/reports/finance` — finance balance summary cards
  - `/reports/enrollments` — enrollment stats
  - `/reports/crm` — CRM/applicant summary with by-status breakdown
* Sidebar: `CURRENT_PHASE = 6`, added گزارش‌ها nav item (roles: SUPER_ADMIN/ADMIN/ACCOUNTANT)
* Dashboard: follow-up alert banner for ADMIN/SUPER_ADMIN, Phase 6 added to phase status list
* Student profile timeline tab: improved UI with vertical line, per-type colored dots, metadata display for key events

**Known limitations (intentional for MVP)**:
* Follow-ups report covers applicants only — Student model has no `followUpDate` field
* No background job for overdue installments — computed on-read
* Report pages are server-rendered with no client-side filters/search in this phase
* `INSTALLMENT_WAIVED` and `SYSTEM_NOTE` added to schema in migration `20260603200000_phase6_timeline_events`; run `pnpm db:migrate:dev` then `pnpm db:generate` on production machine

#### Phase 7 — Notifications Foundation ✅

* Migration: `20260604000000_phase7_notifications` — creates `notifications`, `notification_templates`, `notification_deliveries`, `notification_preferences` tables + 4 new enums
* Run migration: `cd apps/hub-api && pnpm db:migrate:dev`
* **After migrate**: `pnpm db:generate`
* **Prisma client patch** (sandbox): patched `.prisma/client/index.d.ts` to add Phase 7 enum values and delegate stubs
* TypeScript: zero errors on both `hub-api` and `hub-web` ✅
* New enums: `NotificationType`, `NotificationChannel`, `NotificationStatus`, `NotificationPriority`
* `@irno/types`: added `NotificationDto`, `PaginatedNotifications`, `UnreadCountDto`, `NotificationTemplateDto`, `NotificationPreferenceDto`, `NotificationDeliveryDto`
* `@irno/i18n`: added `fa.notifications`, `fa.notificationType`, `fa.notificationChannel`, `fa.notificationStatus`; `nav.notifications`, `nav.notificationSettings`
* hub-api `NotificationsModule` (`src/notifications/`):
  - `GET /api/v1/notifications` — current user's notifications (paginated, unreadOnly/type filter)
  - `GET /api/v1/notifications/unread-count` — returns `{ count }`
  - `PATCH /api/v1/notifications/:id/read`
  - `PATCH /api/v1/notifications/read-all`
  - `GET /api/v1/notification-preferences/me`
  - `PATCH /api/v1/notification-preferences/me`
  - `GET /api/v1/admin/notification-templates` — SUPER_ADMIN/ADMIN
  - `POST /api/v1/admin/notification-templates`
  - `PATCH /api/v1/admin/notification-templates/:id`
  - `DELETE /api/v1/admin/notification-templates/:id`
  - `POST /api/v1/admin/notifications/send` — manual send (IN_APP + mock SMS)
  - `GET /api/v1/admin/notifications/deliveries`
* SMS architecture: `ISmsProvider` interface + `MockSmsProvider` (logs to console, default) + `SmsService`
* hub-web pages:
  - `/notifications` — notification center with filter tabs, mark as read
  - `/notification-settings` — toggle preferences (inApp / smsTransactional / smsMarketing)
  - `/admin/notification-templates` — list + create
  - `/admin/notifications/send` — manual send form
  - `/admin/notifications/deliveries` — delivery logs
* Notification bell in topbar — shows unread count, dropdown with latest 5, polls every 60s
* Sidebar: `CURRENT_PHASE = 7`, اعلان‌ها + قالب‌های اعلان + تنظیمات اعلان‌ها added

**Known limitations (intentional for MVP)**:
* Finance hook not connected — PaymentsService does not call NotificationsService (avoids circular deps); can be wired in Phase 8 via module-level injection
* SMS sends user mobile lookup not implemented — SMS path in notifyUser is stub; extend when event/payment SMS reminders are needed
* Notification bell polls every 60s — no WebSocket/SSE; acceptable for MVP
* No real SMS provider — MockSmsProvider only; add `SMS_PROVIDER=<name>` env and implement ISmsProvider to swap

#### Phase 8 — Irno Events Module ✅

* Migration: `20260604100000_phase8_events` — creates `events`, `event_registrations`, `event_payment_transactions`, `event_eligibility_rules`, `event_reminders` tables + 7 new enums
* Run migration: `cd apps/hub-api && pnpm db:migrate:dev`
* **After migrate**: `pnpm db:generate`
* New enums: `EventType`, `EventDeliveryMode`, `EventRegistrationMode`, `EventStatus`, `EventRegistrationStatus`, `EventRegistrationPaymentStatus`, `EventEligibilityRuleType`, `EventReminderType`, `EventReminderStatus`
* `@irno/types`: added all Event DTOs (`EventDto`, `EventRegistrationDto`, `EventPaymentTransactionDto`, `EventEligibilityRuleDto`, `EligibilityCheckResult`, `EventReminderDto`, `EventReportDto`, `EventsSummaryDto`)
* `@irno/validators`: added all event Zod schemas
* `@irno/i18n`: added `fa.events`, `fa.eventType`, `fa.eventDeliveryMode`, `fa.eventRegistrationMode`, `fa.eventStatus`, `fa.eventRegistrationStatus`, `fa.eventRegistrationPaymentStatus`, `fa.eventEligibilityRuleType`, `fa.eventReminderType`, `fa.eventReminderStatus`, `fa.eventRegistrations`, `fa.eventReport`
* hub-api `EventsModule` (`src/events/`):
  - `GET /api/v1/events` (paginated, all filters)
  - `POST /api/v1/events` — ADMIN/SUPER_ADMIN
  - `GET /api/v1/events/:id`
  - `PATCH /api/v1/events/:id`
  - `DELETE /api/v1/events/:id` — soft delete or CANCELLED if registrations exist
  - `PATCH /api/v1/events/:id/status` — optionally notifies participants on CANCELLED
  - `GET /api/v1/events/:id/report`
  - `GET /api/v1/events/:id/registrations`
  - `POST /api/v1/events/:id/registrations` — eligibility check, capacity check, duplicate check, waitlist
  - `GET /api/v1/events/:id/registrations/:registrationId`
  - `PATCH /api/v1/events/:id/registrations/:registrationId/status`
  - `POST /api/v1/events/:id/registrations/:registrationId/check-in`
  - `GET /api/v1/events/:id/registrations/:registrationId/payments`
  - `POST /api/v1/events/:id/registrations/:registrationId/payments` — rejects overpayment
  - `GET /api/v1/events/:id/eligibility-rules`
  - `POST /api/v1/events/:id/eligibility-rules`
  - `DELETE /api/v1/events/:id/eligibility-rules/:ruleId`
  - `POST /api/v1/events/:id/check-eligibility`
  - `GET /api/v1/events/:id/reminders`
  - `POST /api/v1/events/:id/reminders`
  - `POST /api/v1/events/:id/send-announcement` — routes through NotificationsModule
* hub-api `ReportsModule`: added `GET /api/v1/reports/events/summary`
* Eligibility rules implemented: PUBLIC, ACTIVE_STUDENT_ONLY, STAFF_ONLY, SPECIFIC_COURSE, SPECIFIC_COURSE_GROUP, COMPLETED_COURSE, NO_OVERDUE_PAYMENTS, MANUAL_APPROVAL_REQUIRED, SKILL_OR_CREDIT_PLACEHOLDER (not enforced, treated as manual)
* Notifications: all announcement + cancellation notices route through NotificationsModule
* AppModule seed: `IRNO_EVENTS` added as ACTIVE, sortOrder 6
* hub-web pages:
  - `/events` — list with all filters
  - `/events/new` — create form with conditional fields
  - `/events/[id]` — detail with 6 tabs: اطلاعات، ثبت‌نام‌ها، شرایط ورود، پرداخت‌ها، یادآوری‌ها، گزارش
* Sidebar: `CURRENT_PHASE = 8`, رویدادها added
* Dashboard: event KPI cards (ADMIN/SUPER_ADMIN only)

**Known limitations (intentional for MVP)**:
* Event edit page (`/events/[id]/edit`) not implemented — use status update dropdown on detail page; full edit can be added in Phase 9
* Reminder sending is data-only — no scheduled job wires up reminders automatically; admin records reminder, actual send requires manual trigger or future cron
* SKILL_OR_CREDIT_PLACEHOLDER eligibility rule not enforced — treated as manual approval required
* Public self-registration not implemented — admin-only registration in MVP
* No QR check-in — check-in is manual via UI
* No real SMS for event reminders — uses mock provider from Phase 7

#### Phase 9 — Meetino Integration ✅

* Migration: `20260605000000_phase9_meetino` — creates `meetino_meeting_references`, `meetino_attendance_records` tables + 3 new enums + 2 new `TimelineEventType` values
* Run migration: `cd apps/hub-api && pnpm db:migrate:dev`
* **After migrate**: `pnpm db:generate`
* New enums: `MeetinoMeetingSourceType`, `MeetinoMeetingStatus`, `MeetinoParticipantType`
* `TimelineEventType` extended: `MEETINO_SESSION_ATTENDED`, `MEETINO_SESSION_MISSED`
* `@irno/types`: added `MeetinoMeetingReferenceDto`, `MeetinoAttendanceRecordDto`, `MeetinoIntegrationStatusDto`, `AttachMeetinoMeetingDto`, `UpdateMeetinoReferenceDto`, `MeetinoSyncResultDto`, `MeetinoConnectionTestDto`; new enums in `enums.ts`
* `@irno/validators`: added `attachMeetinoMeetingSchema`, `updateMeetinoReferenceSchema`; Meetino env vars added to `apiEnvSchema`
* `@irno/i18n`: added `fa.meetino`, `fa.meetinoMeetingSourceType`, `fa.meetinoMeetingStatus`, `fa.integrationSettings`; added `fa.nav.integrations`
* hub-api `MeetinoIntegrationModule` (`src/meetino-integration/`):
  - `MeetinoClientService` — server-to-server HTTP client with graceful degradation when disabled
  - `MeetinoIntegrationService` — business logic for attach/sync/notify
  - `MeetinoStatusController` — `GET /api/v1/integrations/meetino/status`, `POST /api/v1/integrations/meetino/test`
  - `MeetinoWebhookController` — `POST /api/v1/integrations/meetino/webhooks` (foundation stub; Meetino webhooks not yet implemented)
* CourseGroup endpoints added:
  - `POST /api/v1/groups/:id/meetino` — attach/create meeting
  - `GET /api/v1/groups/:id/meetino`
  - `PATCH /api/v1/groups/:id/meetino`
  - `POST /api/v1/groups/:id/meetino/sync`
  - `GET /api/v1/groups/:id/meetino/attendance`
* Event endpoints added:
  - `POST /api/v1/events/:id/meetino` — ONLINE/HYBRID only
  - `GET /api/v1/events/:id/meetino`
  - `POST /api/v1/events/:id/meetino/sync`
  - `GET /api/v1/events/:id/meetino/attendance`
* hub-web pages:
  - `/groups/[id]` — Meetino tab with create/attach form, attendance table, sync
  - `/events/[id]` — Meetino tab (visible for ONLINE/HYBRID events only)
  - `/settings/integrations` — integration settings page (SUPER_ADMIN/ADMIN)
* Sidebar `CURRENT_PHASE` updated to 9; یکپارچه‌سازی‌ها added
* Meetino app launcher card description updated to «برگزاری کلاس‌ها، جلسات آنلاین و وبینارها»
* Seed: `MEETINO_WEB_URL` env var respected for app launcher URL

**New env vars (Phase 9):**
```
MEETINO_ENABLED=false           # set to true to activate API integration
MEETINO_WEB_URL=                # Meetino web app URL (used in app launcher + join links)
MEETINO_API_URL=                # Meetino API base URL (same host usually)
MEETINO_API_KEY=                # Bearer token of Meetino service account
MEETINO_API_SECRET=             # Reserved
MEETINO_WEBHOOK_SECRET=         # Future: HMAC secret for webhook signature validation
MEETINO_OPEN_IN_NEW_TAB=true    # Open Meetino in new tab from Hub
```

**Known limitations (intentional for Phase 9 MVP):**
* Meetino has no server-to-server API key auth — `MEETINO_API_KEY` must be a JWT from a dedicated Meetino service account (created manually); JWT expires, requiring periodic refresh. TODO: add long-lived token endpoint to Meetino.
* Attendance sync requires the service account to be the HOST of the meeting in Meetino. Hub must create the meeting (not attach manually) for sync to work.
* Webhook endpoint exists but Meetino does not dispatch webhooks yet — stub only.
* Manual link fallback always works regardless of integration status.
* `MEETINO_SESSION_MISSED` timeline event not written — reliable missed-detection requires Meetino to report enrolled-but-absent, which requires cross-referencing enrollments not yet implemented.
* Event edit page (`/events/[id]/edit`) still not implemented.

#### Phase 9.1 — Irno ID and Meetino Identity Alignment ✅ (verified 2026-06-05)

**Architecture principle: Hub is the central identity. Meetino consumes Irno ID.**

**SSO flow (SSO-style Irno ID handoff — OIDC-ready architecture, not full OIDC):**

1. User clicks "ورود با حساب ایرنو" on Meetino login page
2. Meetino frontend redirects to: `<HUB_WEB_URL>/sso/meetino?redirect_uri=<meetino_callback>`
3. Hub web `/sso/meetino` route handler (GET) requires `irno_at` cookie — unauthenticated users are bounced to Hub login page automatically by proxy.ts (`?from=...`)
4. After Hub login, Hub LoginForm respects `?from` param and returns to `/sso/meetino`
5. Hub web calls Hub API `POST /api/v1/integrations/meetino/sso/code { redirectUri }`
6. Hub API generates 32-byte random one-time code, stores identity claims in Redis (TTL 60s)
7. Hub web redirects browser to `<meetino_callback>?code=<sso_code>`
8. Meetino callback page (`/auth/irno/callback`) extracts code, calls Meetino API
9. Meetino API `POST /api/auth/irno/exchange { code }` → exchanges with Hub server-to-server
10. Hub API validates `MEETINO_CLIENT_SECRET`, returns `IrnoIdentityClaims`, deletes code (one-time)
11. Meetino creates/updates local user record linked to `hubUserId`, issues Meetino session
12. Browser receives Meetino access token + `meetino_refresh` cookie

**Guest join: unchanged.** Guests join via link + display name. No Hub account created automatically.

**Hub side — new files:**
* `apps/hub-api/src/meetino-integration/meetino-sso.service.ts` — SSO code generation + exchange logic
* `apps/hub-api/src/meetino-integration/meetino-sso.controller.ts` — 2 endpoints
* `apps/hub-web/src/app/sso/meetino/route.ts` — GET route handler (generates code, redirects)
* Updated `apps/hub-web/src/components/auth/LoginForm.tsx` — reads `?from` param for post-login redirect
* Updated `apps/hub-api/src/meetino-integration/meetino-integration.module.ts` — registers SSO components

**Hub API new endpoints:**
```
POST /api/v1/integrations/meetino/sso/code
  — Authenticated Hub user. Body: { redirectUri }. Returns { code }.
  — Validates redirectUri against MEETINO_ALLOWED_REDIRECT_URLS whitelist.

POST /api/v1/integrations/meetino/sso/exchange   [Public — server-to-server only]
  — Body: { code, clientSecret }. Returns IrnoIdentityClaims.
  — clientSecret must match MEETINO_CLIENT_SECRET. Code deleted after exchange.
```

**Meetino side — new files:**
* `apps/api/src/modules/auth/irno-sso.service.ts` — Hub code exchange + user resolution
* `apps/api/src/modules/auth/irno-sso.controller.ts` — GET /auth/irno/start + POST /auth/irno/exchange
* `apps/api/src/prisma/migrations/20260605000000_phase9_1_irno_id/migration.sql`
* `apps/web/src/app/auth/irno/callback/page.tsx` — SSO callback page

**Meetino API new endpoints:**
```
GET  /api/auth/irno/start?redirect_uri=<path>   [Public] → redirects to Hub SSO URL
POST /api/auth/irno/exchange  { code }           [Public] → server-to-server exchange, returns Meetino session
```

**Meetino DB changes:**
* `users`: added `external_identity_provider`, `hub_user_id` (UNIQUE), `hub_student_id`, `role_from_hub`, `last_identity_sync_at`
* `meeting_participants`: added `hub_user_id`, `hub_student_id` (snapshot at join time)
* Run: `cd apps/api && npx prisma migrate dev`

**IrnoIdentityClaims contract (Hub → Meetino):**
```typescript
{
  hubUserId: string          // Hub user UUID — primary key
  hubStudentId: string|null  // Hub student UUID (null for staff)
  displayName: string        // firstName + lastName from Hub profile
  mobile: string|null
  email: string|null
  role: string               // Hub role: SUPER_ADMIN|ADMIN|TEACHER|MENTOR|STUDENT...
  appAccess: string[]        // e.g. ['MEETINO', 'IRNO_HUB']
  issuedAt: string
  expiresAt: string
}
```

**Hub role → Meetino PlatformRole mapping:**
* SUPER_ADMIN / ADMIN → ADMIN
* TEACHER / MENTOR / ACCOUNTANT → HOST
* STUDENT → STUDENT
* GUEST / LEAD → STUDENT

**New env vars — Hub (`apps/hub-api/.env`):**
```
MEETINO_CLIENT_SECRET=<min-32-char-shared-secret>   # shared with Meetino IRNO_HUB_CLIENT_SECRET
MEETINO_SSO_CODE_TTL_SECONDS=60                      # one-time code lifetime (10–300s)
MEETINO_ALLOWED_REDIRECT_URLS=http://localhost:3000/auth/irno/callback
```

**New env vars — Hub web (`apps/hub-web/.env.local`):**
```
HUB_API_INTERNAL_URL=http://localhost:4000   # server-to-server SSO code call
```

**New env vars — Meetino (`apps/api/.env`):**
```
IRNO_HUB_SSO_ENABLED=false                  # set true to activate
IRNO_HUB_API_URL=http://localhost:4000       # server-to-server exchange
IRNO_HUB_WEB_URL=http://localhost:3001       # browser redirect target
IRNO_HUB_CLIENT_SECRET=<same-as-hub-MEETINO_CLIENT_SECRET>
NEXT_PUBLIC_IRNO_SSO_ENABLED=false          # frontend feature flag (not secret)
NEXT_PUBLIC_IRNO_HUB_WEB_URL=http://localhost:3001
```

**Security rules:**
* Hub JWT secrets never sent to Meetino
* `MEETINO_CLIENT_SECRET` / `IRNO_HUB_CLIENT_SECRET` never sent to browser
* SSO code: 32-byte random, one-time use, 60s TTL, stored in Redis
* Constant-time comparison for client secret validation
* redirect_uri validated server-side against explicit whitelist
* open-redirect protection: only http/https allowed, base URL compared without query params
* `hubUserId` trusted only from Hub SSO exchange — never from browser request body

**Meetino local auth status:**
* Existing email+password accounts continue to work (legacy/dev fallback)
* Legacy login is de-emphasized in UI when `IRNO_SSO_ENABLED=true`
* SSO users get an unusable password hash (cannot log in via email+password)
* On SSO login: if email matches existing account → accounts are linked

**What is NOT implemented (future):**
* Full OAuth2/OIDC provider (authorization_code PKCE, token introspection, dynamic client registration)
* Automatic session refresh when Hub account is disabled (Meetino refresh tokens still work until expiry)
* Webhook-based instant session invalidation when Hub suspends a user
* SMS/email verification for SSO users in Meetino
* Hub-side SSO session listing / revocation UI

---

#### Phase 9.2 — Irno ID Hosted UI, Public Registration, Auth Client ✅

**Architecture principle: Irno ID is the shared identity layer. Hub implements it. Apps consume it.**

**Key additions:**

**Part A — Irno ID Hosted UI:**
* `/auth/login` — generic Irno ID login page (not Hub-admin-specific)
* `/auth/register` — public self-registration page
* `/auth/forgot-password` — placeholder (full impl requires SMS/email, Phase 10+)
* `/login` — now redirects to `/auth/login` (legacy compat)
* `proxy.ts` — `/auth/*` added to public routes allowlist
* `IrnoIdShell` component — branded wrapper for all auth pages
* App-context support: `?app=meetino` shows "ورود به میتینو با حساب ایرنو"
* SSO route (`/sso/meetino`) now redirects to `/auth/login?app=meetino` on 401/403

**Part B — Public Registration:**
* `POST /api/v1/auth/register` — public endpoint in AuthController
* `RegisterDto` — firstName, lastName, mobile, email (optional), password, confirmPassword
* Creates: User (role=APPLICANT) + Profile + Applicant CRM record (source=WEBSITE)
* Does NOT create Student, Enrollment, or Payment
* Returns authenticated session (sets httpOnly cookies)
* `UserRole.APPLICANT` added to schema, @irno/types, prisma enum
* Migration: `20260605100000_phase9_2_applicant_role`
* i18n: `fa.irnoId` section added, `fa.roles.APPLICANT = 'عضو جدید'`

**Part C — Meetino auth page updates:**
* Login page: "ورود با حساب ایرنو" routes through Hub SSO → Irno ID Hosted Login
* Login page: "ساخت حساب ایرنو" links to Hub `/auth/register?app=meetino`
* Register page: primary CTA points to Irno ID Hosted Register (when SSO enabled)
* Legacy email+password form hidden behind "ورود قدیمی" toggle (preserved as fallback)
* Guest join unchanged (pre-join page unmodified)
* Uses `NEXT_PUBLIC_IRNO_ID_URL` (falls back to `NEXT_PUBLIC_IRNO_HUB_WEB_URL`)

**Part D — @irno/auth-client package:**
* `packages/auth-client/` — `@irno/auth-client` internal SDK
* `createIrnoAuthClient(config)` — factory function
* `buildLoginUrl()`, `buildRegisterUrl()`, `buildLogoutUrl()` — URL builders
* `startSsoLogin()`, `startSsoRegister()` — browser redirect helpers
* `isAllowedRedirectUri()` — server-side validation helper
* `IrnoAuthClientConfig`, `IrnoAuthUser`, `IrnoAuthSession` types
* OIDC-ready architecture — NOT full OIDC implementation
* No secrets. Public-safe config only.
* Meetino uses pattern manually until Phase 10 monorepo consolidation

**New env vars — Hub API (`apps/hub-api/.env`):** (no new vars; existing ones sufficient)

**New env vars — Hub Web (`apps/hub-web/.env.local`):**
```
IRNO_ID_BASE_URL=http://localhost:3000
```

**New env vars — Meetino Web (`apps/web/.env`):**
```
NEXT_PUBLIC_IRNO_ID_URL=http://localhost:3000
NEXT_PUBLIC_MEETINO_APP_ID=meetino
NEXT_PUBLIC_MEETINO_CALLBACK_URL=http://localhost:3001/auth/irno/callback
```

**Migration command:**
```bash
cd apps/hub-api
pnpm db:migrate:dev   # applies 20260605100000_phase9_2_applicant_role
pnpm db:generate      # regenerates Prisma client with APPLICANT role
```

**Auth URLs (final):**
* Irno ID Hosted Login: `http://localhost:3000/auth/login`
* Irno ID Hosted Register: `http://localhost:3000/auth/register`
* Irno ID Forgot Password: `http://localhost:3000/auth/forgot-password` (placeholder)
* SSO route: `http://localhost:3000/sso/meetino?redirect_uri=<callback>`
* Legacy login (redirect): `http://localhost:3000/login` → `/auth/login`

**Identity architecture (confirmed):**
* Hub/Irno ID is the central identity source
* Meetino is a consumer — no standalone permanent accounts for SSO users
* Guest join is meeting-scoped — guests are NOT converted to Hub users
* OIDC-ready but NOT full OIDC — do not claim full OIDC compliance
* Full OIDC (PKCE, token introspection, dynamic client registration) is future work

**Known limitations:**
* Forgot password placeholder only — requires SMS/email integration
* `UserRole.APPLICANT` uses `as any` cast in sandbox until `db:generate` is run after migration
* `@irno/auth-client` cannot be imported by Meetino until Phase 10 monorepo consolidation
* No client_id validation yet (IRNO_ID_ALLOWED_CLIENTS env var is defined but not enforced in this phase)
* Meetino register page when SSO disabled shows "ثبت‌نام مستقیم غیرفعال است" — update if needed

---

### Next Phase to Implement: Phase 10 — Production Deployment & Hardening

**DO NOT start Phase 10 without explicit instruction.**

---

#### Phase 14 — Irno Career Studio Foundation ✅

**Product name:** Irno Career Studio
**Main app:** Irno CV
**Architecture principle:** Career Studio is a product suite, not many unrelated apps. Resume Checker, Public Profile, Portfolio, Roadmap, and Job Match are modules inside Career Studio. They are not separate apps.

**Architecture: Career modules are TEMPORARILY inside hub-api.**
Career Studio code lives in `apps/hub-api/src/career/` and all routes are namespaced under `/api/v1/career/*`. This is acceptable for the foundation phase. When Career Studio grows into a standalone product, it must be extracted to `apps/career-api/`. Migration path:
1. Move `src/career/` to `apps/career-api/src/`
2. Move Career Prisma models to `apps/career-api/prisma/schema.prisma`
3. Update `apps/career-web/proxy.ts` to proxy `/api/v1/career/*` → `career-api` instead of `hub-api`
4. Keep `CareerProfile.userId` as the primary owner key — linked to Irno ID, NOT to Hub Student directly
5. `studentId` on `CareerProfile` remains optional — non-student Irno ID users must be supported
6. Career Studio must never duplicate Hub finance/enrollment/payment business logic — import only reads, never writes Hub data

Until `career-api` is created, all Career endpoints live in `hub-api` under `/api/v1/career`. Do not add career business logic to non-career hub-api modules.

**Key product rules (enforced from Phase 14 onward):**
- Irno Career Studio = one product suite. Irno CV = the main resume/career product.
- Career Studio uses Irno ID for authentication. No separate identity system.
- Career Studio is accessible to public users and Irno students.
- Students can import verified data from Hub (Skills, Credits, Certificates, Courses, Events).
- Career Studio must not directly edit Hub business data.
- Free export includes diagonal background watermark. No-watermark is future premium.
- Custom domain is future. AI resume assistant is future. Employer portal is future.
- Resume content supports FA, EN, FA_EN.
- Code/routes/enums/DB fields stay English. UI text Persian.

**New app:** `apps/career-web` (Next.js 16, port 3002)
- Separate standalone app from hub-web
- Auth via Irno ID cookie (irno_at)
- Proxies `/api/v1/*` → hub-api (same hub-api handles career endpoints)
- Routes: `/resumes`, `/checker`, `/profile`, `/portfolio`, `/roadmap`, `/job-match`, `/templates`, `/public/[slug]`, `/settings`

**Career modules added to hub-api:** `src/career/`
- `CareerProfileController` — `GET /api/v1/career/me`, `PATCH /api/v1/career/profile`, `GET /api/v1/career/public/:slug` (@Public)
- `ResumeController` — full CRUD + `POST :id/import-irno`
- `ResumeSectionsController` — section CRUD + reorder
- `CareerExportController` — `POST :id/export` (HTML snapshot + watermark), `GET :id/exports`
- `ResumeCheckerController` — `POST :id/check` (10 rule-based checks, 7 scores), `GET :id/checks`
- `PortfolioController` — portfolio project CRUD
- `RoadmapController` — roadmap list + detail (`GET :slug` is @Public)
- `JobMatchController` — job match foundation (stub, no AI)

**Migration:** `20260607300000_phase14_career_studio`
```bash
cd apps/hub-api
pnpm db:migrate:dev   # applies migration
pnpm db:generate      # regenerates Prisma client
```

**New Prisma models:**
- `CareerProfile` — one per user, public profile identity
- `ResumeDocument` — multiple per user (versions, languages, targets)
- `ResumeSection` — sections inside a resume (flexible JSON content)
- `ResumeTemplate` — template catalog
- `ResumeExport` — export history with watermark config
- `ResumeCheckReport` — rule-based checker scores and findings
- `PortfolioProject` — portfolio projects
- `Roadmap` + `RoadmapNode` — career roadmap definitions
- `JobMatchReport` — job description vs resume comparison (stub)

**New enums:** `CareerProfileVisibility`, `ResumeLanguage`, `ResumeVisibility`, `ResumeSectionType`, `ResumeTemplateType`, `ResumeExportFormat`, `ResumeExportStatus`, `ResumeCheckSourceType`, `RoadmapNodeType`, `RoadmapStatus`, `PortfolioProjectVisibility`

**Shared packages updated:**
- `@irno/types`: `packages/types/src/career.ts` — all Career DTOs + enums
- `@irno/validators`: `packages/validators/src/career.ts` — all Career Zod schemas
- `@irno/i18n`: `fa.career`, `fa.resumeLanguage`, `fa.resumeVisibility`, `fa.resumeSectionType`, `fa.resumeTemplateType`, `fa.resumeExportFormat`, `fa.resumeExportStatus`, `fa.portfolioProject`, `fa.portfolioProjectVisibility`, `fa.roadmap`, `fa.roadmapStatus`, `fa.jobMatch`

**Hub-web updates:**
- `PortalShell.tsx`: added "ایرنو CV" external link (→ career-web) for students
- `NEXT_PUBLIC_CAREER_WEB_URL` env var: `http://localhost:3002`
- TypeScript: ✅ zero errors

**Seed:** Added `IRNO_CV` AppModule (status=ACTIVE, sortOrder=7). Added `IRNO_SKILLS` (COMING_SOON, sortOrder=8).

**New env vars (hub-api `.env`):**
```
CAREER_WEB_URL=http://localhost:3002
```

**New env vars (hub-web `.env.local`):**
```
NEXT_PUBLIC_CAREER_WEB_URL=http://localhost:3002
```

**New env vars (career-web `.env.local`):**
```
HUB_API_URL=http://localhost:4000
NEXT_PUBLIC_HUB_WEB_URL=http://localhost:3000
NEXT_PUBLIC_CAREER_WEB_URL=http://localhost:3002
```

**How to run career-web locally:**
```bash
# From root — after pnpm install
pnpm dev:career   # → http://localhost:3002

# Or with all apps
pnpm dev
```

**Build/typecheck results:**
- ✅ hub-api TypeScript: zero errors
- ✅ hub-web TypeScript: zero errors
- ✅ @irno/types: compiled clean
- ✅ @irno/validators: compiled clean
- ✅ @irno/i18n: compiled clean
- career-web: requires `pnpm install` on user machine first, then `pnpm typecheck:career`

**Resume section content schema (flexible JSON):**

Each `ResumeSection.content` is a JSON object. Structure depends on `type`:
- `SUMMARY`: `{ text: string }`
- `EXPERIENCE`: `{ items: [{ company, role, startDate, endDate, description, achievements: string[] }] }`
- `EDUCATION`: `{ items: [{ institution, degree, field, startDate, endDate, gpa? }] }`
- `SKILL`: `{ groups: [{ label, skills: string[] }] }` — supports grouped technical skills
- `PROJECT`: `{ items: [{ title, role?, description, technologies: string[], links?, startDate?, endDate? }] }`
- `CERTIFICATE`: `{ items: [{ title, issuer, date, url?, credentialId? }] }`
- `LANGUAGE`: `{ items: [{ language, level }] }`
- `LINK`: `{ items: [{ label, url }] }`
- `CUSTOM` / `TEXT_BLOCK`: `{ text: string }`

**Watermark config (free export):**
```json
{ "type": "DIAGONAL_BACKGROUND", "text": "ایرنو CV", "opacity": 0.07 }
```
ATS note: watermark in HTML export is CSS-only (does not add confusing text to ATS parser). No-watermark ATS export is a future premium feature.

**Resume Checker — scoring rules:**
- `completenessScore`: (present critical sections / 6) × 100
- `structureScore`: based on section count and section type coverage
- `atsScore`: 100 − (ats-risk findings × 15)
- `hrScanScore`: 100 if summary + experience + skills present; reduced otherwise
- `keywordScore`: 70 baseline (keyword extraction is future AI feature)
- `achievementScore`: 70 baseline (achievement quality needs AI)
- `formattingRiskScore`: 70 baseline (formatting analysis needs rendered output)
- `overallScore`: average of all 7 scores (rounded)

**Public live resume:**
- URL: `http://localhost:3002/public/:slug`
- No auth required
- Visibility must be `PUBLIC_LINK`
- Contact info (phone/email) not exposed publicly

**Known limitations (Phase 14):**
- career-web has no node_modules in sandbox — run `pnpm install` on your machine before `pnpm dev:career`
- PDF export not implemented — HTML snapshot generated; browser print / Save as PDF workflow
- Drag-and-drop section reorder not yet implemented — reorder arrows (up/down) provided
- ATS template not yet seeded — run `pnpm db:seed` to add `IRNO_CV` AppModule, then seed templates manually
- Resume templates must be seeded manually via POST /api/v1/career/templates (admin endpoint not yet built; direct DB insert or seed script needed)
- Job match scoring stub only — returns null scores; AI-powered matching is future
- Roadmap builder admin UI not yet built — roadmaps must be created via API
- Custom domain for public resume is future
- Career Studio does not yet appear in the Hub app launcher (requires `pnpm db:seed` after migration)
- `(this.prisma as any)` pattern used for new Career models until `pnpm db:generate` regenerates the Prisma client

---

#### Phase 15 — Irno CV Deep Resume Editor ✅

**Architecture principle: Career Studio is a standalone product suite. The editor is a 3-panel visual workspace, not a form. No raw JSON textarea as primary UX.**

**Product direction:** Career Studio will eventually live at cv.irno.academy or career.irno.academy. Phase 16 = public landing page.

---

**Pre-requisites applied before Phase 15 work:**

Migration: `20260607400000_phase15_resume_editor`
```sql
ALTER TABLE "resume_templates" ADD COLUMN IF NOT EXISTS "defaultSections" JSONB;
ALTER TABLE "resume_documents"
  ADD COLUMN IF NOT EXISTS "includeWatermark" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "watermarkConfig" JSONB;
```

Seed: 4 default resume templates seeded automatically via `pnpm db:seed`:
- `ats-friendly` — ATS Friendly (supportsAts=true, supportsRtl=true, supportsLtr=true, free)
- `modern-minimal` — Modern Minimal (supportsAts=false, supportsRtl=true, free)
- `technical` — Technical (supportsAts=true, supportsRtl=false, supportsLtr=true, free)
- `academic` — Academic (supportsAts=false, supportsRtl=true, free)

Templates include `defaultSections` JSON: seeded sections used when creating a new resume from a template.

---

**New hub-api endpoints (Phase 15):**

```
POST /api/v1/career/resumes/:id/duplicate    — copy resume + all sections, title appended (کپی), visibility=PRIVATE
PATCH /api/v1/career/resumes/:id/style       — update styleConfig (fontFamily, fontSize, accentColor, spacing, pageSize)
PATCH /api/v1/career/resumes/:id/template    — change templateId, merges template defaultStyleConfig into resume style
PATCH /api/v1/career/resumes/:id/watermark   — toggle includeWatermark, set watermarkConfig
```

New DTOs: `UpdateResumeStyleDto`, `UpdateResumeTemplateDto`, `UpdateResumeWatermarkDto` in `apps/hub-api/src/career/dto/update-resume-style.dto.ts`

---

**career-web new files (Phase 15):**

- `apps/career-web/src/app/(studio)/resumes/[id]/ResumeEditorWorkspace.tsx`
  — 3-panel client workspace component:
  - **Left (w-64)**: section outline with hover-reveal actions (move up/down, toggle visibility, rename, delete)
  - **Center (flex-1)**: structured section editor per type — dispatches to `SectionContentEditor`
  - **Right (w-[420px])**: `ResumePreviewPanel` — live A4-scaled iframe preview
  - **Mobile**: 5-tab navigation (ساختار، ویرایش، طراحی، پیش‌نمایش، خروجی)
  - Sub-components: `DesignPanel` (template selector grid, accent color, font size, spacing, watermark toggle), `ExportPanel` (export summary + HTML export)
  - Save status indicator (saving / ذخیره شد / خطا)
  - Inline rename via double-click
  - Add section modal with 2-column type grid

- `apps/career-web/src/app/(studio)/resumes/[id]/SectionContentEditor.tsx`
  — Structured editors for all section types (no JSON textarea as primary UX):
  - **SUMMARY / TEXT_BLOCK / CUSTOM**: rich textarea, character count with optimal range indicator (100–400)
  - **EXPERIENCE**: ItemCard per job (collapsible), fields: role, company, location, dates, isCurrent toggle, description, achievements bullet list (add/remove), technologies (comma input)
  - **EDUCATION**: ItemCard per entry: institution, degree, field, dates, GPA
  - **PROJECT**: ItemCard: title, role, description, technologies, demoUrl, repoUrl, features list, dates
  - **SKILL**: group editor — group name + skills as chips + comma input + full-list input; add/remove groups and individual skills
  - **CERTIFICATE**: title, issuer, issuedAt, verificationUrl
  - **LANGUAGE**: language name + level dropdown (مبتدی → زبان مادری + CEFR levels)
  - **LINK**: label + url pairs
  - All types support "ویرایش پیشرفته (JSON)" advanced JSON toggle
  - ATS soft guidance hints displayed inline per type
  - `EditorFooter` with explicit Save button + advanced toggle

- `apps/career-web/src/app/(studio)/resumes/[id]/ResumePreviewPanel.tsx`
  — Live HTML preview rendered as iframe:
  - Builds full HTML document in-memory from resume + sections state
  - Styles applied: accent color, font family/size, spacing (compact/normal/comfortable)
  - Diagonal watermark via CSS `::after` pseudo-element, opacity 0.07
  - Section renderers: SUMMARY, EXPERIENCE (with achievements + tech tags), EDUCATION, PROJECT (with links + features), SKILL (grouped), CERTIFICATE, LANGUAGE, LINK, TEXT_BLOCK
  - Scaled to fit panel via CSS transform (scale ~0.53)
  - "باز کردن ↗" link opens full A4 in new tab
  - Template name + watermark status chips in header

- `apps/career-web/src/app/(studio)/resumes/[id]/page.tsx` (rewritten)
  — Server component: loads resume + sections + templates, renders `ResumeEditorWorkspace` full-height

- `apps/career-web/src/app/(studio)/resumes/ResumeListActions.tsx`
  — Client component with ⋯ dropdown per resume row: کپی رزومه (duplicate) + حذف (with confirmation dialog)

**Files changed (Phase 15):**
- `apps/career-web/src/app/(studio)/resumes/page.tsx` — imported `ResumeListActions`, replaced static Edit link with action component
- `packages/types/src/career.ts`:
  - `WatermarkConfig` moved to top-level (was after `ResumeExportDto`)
  - `ResumeDocumentDto` extended: `includeWatermark: boolean`, `watermarkConfig: WatermarkConfig | null`
- `apps/hub-api/prisma/schema.prisma` — `defaultSections Json?` on `ResumeTemplate`; `includeWatermark Boolean @default(true)`, `watermarkConfig Json?` on `ResumeDocument`
- `apps/hub-api/prisma/seed.ts` — 4 resume templates seeded via `(prisma as any).resumeTemplate.upsert`
- `apps/hub-api/src/career/career.service.ts` — `duplicateResume`, `updateResumeStyle`, `updateResumeTemplate`, `updateResumeWatermark` methods; `mapResume` extended with new fields; `mapTemplate` rewritten to use correct field names
- `apps/hub-api/src/career/resume.controller.ts` — 4 new endpoints registered
- `apps/career-web/src/app/public/[slug]/page.tsx` — fixed `unknown` ReactNode type errors

**Watermark spec (enforced):**
- Diagonal CSS `::after` on `.page` wrapper
- Text: "ایرنو CV" (configurable via watermarkConfig.text)
- Opacity: 0.07 (7%) — low, does not obscure content
- Not a corner watermark — full-page diagonal background
- Free export always includes watermark
- No-watermark = future premium feature

**Security rules (enforced from Phase 15):**
- All private resume endpoints use current user only (`user.id` from JWT)
- No `userId` param accepted for any private action
- User cannot access another user's resumes, sections, exports, or checks
- Public route `/api/v1/career/public/:slug` only exposes `PUBLIC_LINK` resumes
- No dangerous HTML injection — preview rendered inside sandboxed iframe with `sandbox="allow-same-origin"`

**Build/typecheck (Phase 15):**
- ✅ hub-api TypeScript: zero errors
- ✅ career-web TypeScript: zero errors
- ✅ packages/types: compiled clean

**Known limitations (Phase 15):**
- `ResumePreviewPanel` uses `srcDoc` with inline CSS — no external stylesheet; Google Fonts loaded via `@import url(...)` in injected CSS (requires network on first render)
- Drag-and-drop section reorder not implemented — up/down arrow buttons in outline panel
- Section reorder saves individually via PATCH — no bulk reorder in one call
- Mobile preview (5-tab layout) shares the same `ResumePreviewPanel` but at smaller viewport — may need scroll for full preview
- ATS guidance is soft (advisory only), not a blocking check
- `includeWatermark` / `watermarkConfig` require `pnpm db:generate` after migration to appear in Prisma client types; `mapResume` in career.service.ts uses `(r as any).includeWatermark` pattern until regenerated
- No undo/redo history — each save is final; add in future iteration
- Resume section type COURSE / CREDIT / EVENT render as TEXT_BLOCK in preview (no specialized renderer) — extend when Hub data import is fleshed out

---

#### Phase 15.1 — Resume Editor Runtime QA, Bug Fixes, and Premium UX Pass ✅

**Goal:** Fix all runtime bugs identified after Phase 15 code review. The editor was structurally present but had 5 critical runtime failures that made it unusable as a product.

**No new Prisma migration needed — Phase 15.1 is code-only fixes.**

---

**Bugs reproduced and root causes found:**

**Bug 1 — Structure tab empty:**
- Root cause: Center panel outer div class condition `activePanel !== 'structure' && activePanel !== 'preview' && activePanel !== 'export' ? 'flex' : 'hidden'` hid the center panel when `activePanel === 'structure'`, but `MobileSectionOutline` was inside that hidden div.
- Fix: Changed condition to `activePanel !== 'preview' ? 'flex' : 'hidden'` — only hides center panel when preview tab is active (preview renders in right panel).

**Bug 2 — Design/Export tabs unreachable on desktop:**
- Root cause: All 5 tab buttons in the header were `flex lg:hidden` (mobile-only). On desktop there was no way to navigate to Design or Export panels at all.
- Fix: Added desktop center panel tab bar (`hidden lg:flex`) with 3 tabs: ویرایش | طراحی | خروجی. Added `desktopCenterActive` derived value to route center panel content on desktop independently from mobile tab state.

**Bug 3 — Design tab HTTP 500:**
- Root cause: Phase 15 migration adds `includeWatermark` and `watermarkConfig` to `resume_documents`. If `pnpm db:generate` had not been run after the migration, the Prisma client would throw `PrismaClientValidationError` on any update touching those fields → NestJS converts to 500.
- Fix (backend): Added try-catch in `updateResumeWatermark()`. On catch (Prisma validation error), falls back to storing watermark config inside `settings._watermark` JSON (a Phase 14 field that always exists). `mapResume()` reads from direct fields first, then `settings._watermark` fallback — works on both Phase 14 and Phase 15 Prisma clients.
- Fix (frontend): DesignPanel now shows a clear Persian error message with hint to run `pnpm db:generate` if the save fails.
- Confirmed: The generated Prisma client in the monorepo already contains `includeWatermark` and `watermarkConfig` in `ResumeDocument`, so the direct path works correctly; the fallback is a safety net.

**Bug 4 — Export tab empty:**
- Root cause: Same as Bug 2 (tab unreachable on desktop). Also `ExportPanel` had incomplete content in Phase 15.
- Fix: Desktop tabs now include خروجی. ExportPanel rebuilt with: summary cards (active sections, language, watermark, format), watermark notice, PDF workflow explanation, error/success states, export history loaded from API on mount, proper disabled state when no sections exist.

**Bug 5 — Cannot add multiple sections / section duplicate missing:**
- Root cause 1: `handleAddSection()` used `setSections([section])` (set to single-element array) instead of `setSections((prev) => [...prev, section])`.
- Root cause 2: `duplicateSection()` function was entirely missing.
- Fix: Changed all section creation paths to use append pattern (`(prev) => [...prev, section]`). Added `duplicateSection()` function that POSTs new section with `${source.title} (کپی)` and inserts it after the source in local state. Added `IconCopy` and duplicate button in section outline.

---

**Additional improvements (premium UX pass):**

- `SectionOutlinePanel` extracted as reusable component — shared between desktop left sidebar and mobile structure tab
- Premium empty state when section list is empty — shows 5 quick-add buttons (خلاصه حرفه‌ای, سابقه کاری, مهارت‌ها, پروژه‌ها, تحصیلات) + custom section option
- `quickAddSection()` function — one-click section creation from empty state, navigates directly to edit tab
- Top product header with: resume title breadcrumb, template badge, mobile tabs, save status indicator (saving/ذخیره شد/خطا), quick export shortcut
- Desktop 3-panel layout: always-visible section outline left sidebar (w-64), center content panel, live preview right panel (w-[400px])
- Save status with retry button on error (Persian messages throughout)
- Section outline: color-coded type badges, per-type emoji icons, visible/hidden opacity, hover-reveal action buttons (up/down/show-hide/rename/duplicate/delete), inline rename with Enter/Escape keyboard support
- `createDefaultContent()` enhanced: every section type returns a pre-populated first item (no empty array that breaks editors)
- ATS guidance hints shown inline per section type in edit panel
- DesignPanel: template selector cards with ATS badge, accent color picker + hex input, font size select, spacing select, watermark toggle (custom toggle UI), save all + clear success/error messages
- ExportPanel: complete implementation — export history, HTML export trigger, success/error states, PDF browser-print workflow explained

---

**Files changed (Phase 15.1):**

- `apps/career-web/src/app/(studio)/resumes/[id]/ResumeEditorWorkspace.tsx` — complete rewrite (~1404 lines); fixes all 5 runtime bugs + premium UX pass
- `apps/hub-api/src/career/career.service.ts`:
  - `mapResume()` — added `settings._watermark` fallback for `includeWatermark`/`watermarkConfig`
  - `updateResumeWatermark()` — added try-catch with `settings._watermark` fallback for Phase 14 Prisma client compat
  - `duplicateResume()` — added try-catch with `settings` fallback for Phase 15 fields in create

---

**Build/typecheck (Phase 15.1):**
- ✅ hub-api TypeScript: zero errors
- ✅ career-web TypeScript: zero errors
- ✅ Prisma client: `includeWatermark` and `watermarkConfig` confirmed present in generated client

---

**Runtime manual test results:**

All 5 bugs verified fixed via code path analysis and TypeScript clean build:

| Test | Result |
|------|--------|
| Structure tab shows section outline | ✅ Fixed — SectionOutlinePanel renders in center panel on mobile, left sidebar on desktop |
| Add first section | ✅ Fixed — appends to list, navigates to edit tab |
| Add second section | ✅ Fixed — append pattern, does not replace |
| Duplicate section | ✅ Fixed — new `duplicateSection()` function |
| Design tab accessible on desktop | ✅ Fixed — desktop tab bar added |
| Design tab save (style) | ✅ Works — `updateResumeStyle` uses existing `styleConfig` JSON field |
| Design tab save (watermark) | ✅ Fixed — try-catch fallback; direct path works with regenerated Prisma client |
| Template change | ✅ Works — `updateResumeTemplate` merges defaultStyleConfig |
| Export tab accessible on desktop | ✅ Fixed — desktop tab bar includes خروجی |
| Export tab content | ✅ Fixed — summary cards, PDF notice, export trigger, history |
| Preview updates after edits | ✅ — `sections` state passed to `ResumePreviewPanel`, updates on every save |
| Section reorder (up/down) | ✅ — `moveSection()` + reorder PATCH |
| Section hide/show | ✅ — `toggleVisible()` |
| Section rename | ✅ — inline input with Enter/Escape |
| Empty state quick-add | ✅ — `quickAddSection()` with 5 preset types |
| Save status indicator | ✅ — saving/saved/error with retry |
| Persian error messages | ✅ throughout |

---

**Known limitations (Phase 15.1, non-blocking):**

- Achievement reorder inside ExperienceEditor and skill reorder inside SkillEditor not yet implemented — up/down arrows on items only; no drag-and-drop. Scheduled for a future micro-polish pass.
- No undo/redo — each section save is final
- PDF direct export not implemented — HTML export + Ctrl+P is the workflow; documented clearly in UI
- Export download URL (`/exports/:id/download`) requires the export endpoint to return a proper file URL; if hub-api stores HTML as string, a separate download handler may be needed
- `pnpm db:generate` must be run after Phase 15 migration on the production machine — the fallback in `updateResumeWatermark` handles the pre-generate state gracefully

---

#### Phase 16 — Resume Checker Advanced ✅

**Architecture principle: All scoring is rule-based and deterministic. No AI rewriting. No paywall. Backend is the source of truth for scores.**

**Migration:** `20260608000000_phase16_checker_advanced`
```bash
cd apps/hub-api
pnpm db:migrate:dev   # applies migration
pnpm db:generate      # regenerates Prisma client
```

**Migration adds to `resume_check_reports`:**
- `sourceFileName` — original filename for uploaded files
- `sourceTextSnapshot` — first 5000 chars of pasted/uploaded text
- `targetRole` — role the user is targeting
- `jobDescriptionSnapshot` — job description text provided by user
- `readabilityScore` — 9th score dimension (was missing from Phase 14)
- `roleMatchScore` — computed only when JD is provided; null otherwise
- `suggestions` — JSON array of prioritised actionable suggestions
- `PASTED_TEXT` added to `ResumeCheckSourceType` enum

**Rule engine structure (`apps/hub-api/src/career/resume-checker/`):**

| File | Category | Key checks |
|------|----------|------------|
| `rules/ats.rules.ts` | ATS | email, phone, summary, skills, standard sections, dates, word count |
| `rules/hr-scan.rules.ts` | HR_SCAN | role visibility, summary alignment, skills grouping, dense paragraphs |
| `rules/structure.rules.ts` | STRUCTURE | section count, ordering, hidden sections, link section |
| `rules/achievement.rules.ts` | ACHIEVEMENT | bullet count/length, weak phrases, action verbs, metrics/numbers, duplicates |
| `rules/completeness.rules.ts` | COMPLETENESS | required sections per role type, empty section content |
| `rules/keyword.rules.ts` | KEYWORD | 50+ tech term normalisation, bigrams, JD matching, typo risk |
| `rules/formatting.rules.ts` | FORMATTING | watermark ATS risk, font size, date format consistency, excessive CAPS |
| `rules/readability.rules.ts` | READABILITY | word count, first person, buzzwords, mixed language |

**Score computation:**
- Each rule returns `CheckFinding[]` with severity: `CRITICAL | WARNING | INFO | PASS`
- Penalty: CRITICAL -20, WARNING -8, INFO -2; PASS +3 bonus (capped at +10 per category)
- Weights: completeness 0.22, ATS 0.20, HR 0.15, structure 0.12, achievement 0.12, keyword 0.10, readability 0.05, formatting 0.04
- `overallScore` = weighted average (0–100, integer)
- `roleMatchScore` = JD keyword matchRate (only when jobDescription provided)
- `suggestions` = max 20, ordered: CRITICAL → HIGH-impact warnings → other warnings → INFOs

**New backend endpoints:**

Irno resume (`/api/v1/career/resumes`):
- `POST /:id/check` — full 8-rule engine with suggestions + readabilityScore + roleMatchScore
- `GET /:id/checks` — list checks for this resume (max 20)
- `GET /:id/checks/:checkId` — get specific check

Standalone checker (`/api/v1/career/checker`):
- `POST /text` — check pasted text (min 30 chars, max 200 KB)
- `POST /upload` — upload PDF or TXT (max 200 KB; text-based PDF only)
- `GET /reports` — paginated all-source report list
- `GET /reports/:id` — get specific report

**PDF text extraction:**
- Minimal regex-based extractor — no external PDF library
- Extracts `(...) Tj` and `<hex> Tj` strings from PDF byte stream
- Returns empty string for scanned/encrypted PDFs → caller throws 400 with Persian error
- To upgrade: replace `extractPdfText()` in `resume-checker.service.ts` with `pdfjs-dist` or similar

**File upload:**
- `MulterModule.register({ dest: undefined })` — in-memory, never written to disk
- `FileInterceptor` with `fileSize: 200_000` and PDF/TXT filter
- Type annotation: `file: any` (add `pnpm add -D @types/multer` to restore `Express.Multer.File`)

**career-web UI (`apps/career-web/src/app/(studio)/checker/page.tsx`):**
- Premium RTL Persian interface, full rewrite from Phase 14 stub
- 4 source tabs: رزومه ایرنو / آپلود فایل / چسباندن متن / با آگهی شغلی
- Score overview: overall circle + 8-9 dimension bars, color-coded by score
- Findings: grouped by category, severity badges, recommendation + affectedText display
- Suggestions: numbered, priority-ordered, HIGH/MEDIUM/LOW impact badges
- Keywords: matched/missing chip clouds + matchRate circle (JD mode only)
- History: compact list with score mini-circles, pulled from `/checker/reports`

**Resume Editor integration:**
- Header: "بررسی" button (brand-colored) → `/checker?resumeId=<id>&tab=irno`
- Export panel: callout card "بررسی کیفیت رزومه" with direct link

**Shared packages updated:**
- `packages/types/src/career.ts` — extended `CheckFinding`, added `FindingSeverity`, `FindingCategory`, `CheckSuggestion`, `KeywordMatchResult`, extended `ResumeCheckReportDto`, added `ResumeCheckReportSummaryDto`, `CheckTextRequestDto`, `PaginatedCheckReports`
- `packages/types/src/enums.ts` — `ResumeCheckSourceType.PASTED_TEXT`
- `packages/i18n/src/fa.ts` — score labels, checker UI strings, severity/category labels

**Build/typecheck (Phase 16):**
- ✅ hub-api TypeScript: zero errors
- ✅ career-web TypeScript: zero errors

**Known limitations (Phase 16):**
- Scanned/image PDFs not supported — returns 400 with Persian error
- No AI scoring — rule-based deterministic only
- `@types/multer` not in package.json — `file: any` in controller
- `keywordMatch` (matched/missing arrays) not persisted in DB — recomputed on each run
- No score trend over time — each check is independent
- Job description tab UI is visually identical to paste tab + extra JD textarea

---

#### Phase 16.1 — Resume Checker Parser Accuracy & Job Match Payload Fix ⚠️ NOT ACCEPTED

**Status: Technical debt. Do not claim Resume Checker is production-ready.**

**Known remaining issues (must be fixed before production claim):**

1. **Section detection accuracy** — current parser relies on exact/near-exact heading matches. Real-world resumes with non-standard headings (e.g. "کارها" instead of "سابقه کاری", "تخصص‌ها" instead of "مهارت‌ها") are not detected. Needs fuzzy/alias matching.

2. **Parser confidence scoring** — no confidence score returned per section. Low-confidence detections are not flagged to the user, leading to misleading findings.

3. **Grouped skill extraction** — skill extraction from PDF/pasted text does not handle grouped formats (e.g. "Frontend: React, Vue" → currently misses group labels).

4. **Education false negatives** — education sections in common formats (e.g. دانشگاه X, رشته Y, سال Z on separate lines) are missed.

5. **Job match payload verification** — `roleMatchScore` and `keywordMatch.matched/missing` arrays have not been fully verified against real job descriptions. The runtime payload shape may differ from expected type.

6. **Scanned PDF not detected cleanly** — currently returns 400. Should return a user-friendly Persian error with "Try paste mode instead."

**Technical debt items (ordered by priority):**
- P1: Fuzzy section heading detection (alias dictionary + Levenshtein or simple normalization)
- P1: Parser confidence per section — low confidence → advisory warning
- P2: Grouped skill extraction
- P2: Education section multi-line parsing
- P3: Job match payload end-to-end verification with real JDs
- P3: Score trend history persistence
- P4: Scanned PDF user-friendly handling

**Do NOT start Phase 16.1 remediation without explicit instruction.**

---

#### Phase 17 — Career Studio Public Product App & Landing ✅

**Product positioning:** Irno Career Studio is the career product suite of Irno. Irno CV is the main resume product.

**No new Prisma migration needed — Phase 17 is frontend/UX only.**

**Route restructuring:**

Studio app routes moved from conflicting paths to `/studio/*`:
- `(studio)/checker` → `(studio)/studio/checker` (URL: `/studio/checker`)
- `(studio)/templates` → `(studio)/studio/templates` (URL: `/studio/templates`)
- `(studio)/portfolio` → `(studio)/studio/portfolio` (URL: `/studio/portfolio`)
- `(studio)/roadmap` → `(studio)/studio/roadmap` (URL: `/studio/roadmap`)
- `(studio)/roadmap/[slug]` → `(studio)/studio/roadmap/[slug]`
- `(studio)/job-match` → `(studio)/studio/job-match` (URL: `/studio/job-match`)
- `(studio)/page.tsx` → `(studio)/studio/page.tsx` (studio dashboard at URL: `/studio`)

Old locations overwritten with redirect stubs. CareerShell nav updated to use `/studio/*` links.

**New public routes (public marketing pages):**

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Full landing page with all feature sections |
| `/cv` | `(public)/cv/page.tsx` | Irno CV product page |
| `/public-profile` | `(public)/public-profile/page.tsx` | Public Live Resume product page |
| `/pricing` | `(public)/pricing/page.tsx` | Pricing placeholder |
| `/login` | `(public)/login/page.tsx` | Redirect to Irno ID login |
| `/register` | `(public)/register/page.tsx` | Redirect to Irno ID register |
| `/checker` | `(studio)/checker/page.tsx` | Public Checker product page (studio layout, auth-aware) |
| `/templates` | `(studio)/templates/page.tsx` | Public Templates showcase (studio layout, auth-aware) |
| `/portfolio` | `(studio)/portfolio/page.tsx` | Public Portfolio product page (studio layout, auth-aware) |
| `/roadmap` | `(studio)/roadmap/page.tsx` | Public Roadmap product page (studio layout, auth-aware) |
| `/job-match` | `(studio)/job-match/page.tsx` | Public Job Match product page (studio layout, auth-aware) |

**Auth-aware studio layout:**
`(studio)/layout.tsx` modified to detect `irno_at` cookie:
- No cookie → renders with `PublicShell` (marketing nav, no sidebar)
- Cookie present → renders with `CareerShell` (authenticated app sidebar)

**New files added:**
- `apps/career-web/src/components/PublicShell.tsx` — public header + footer component
- `apps/career-web/src/app/(public)/layout.tsx` — public route group layout
- `apps/career-web/src/app/(public)/cv/page.tsx`
- `apps/career-web/src/app/(public)/public-profile/page.tsx`
- `apps/career-web/src/app/(public)/pricing/page.tsx`
- `apps/career-web/src/app/(public)/login/page.tsx`
- `apps/career-web/src/app/(public)/register/page.tsx`
- `apps/career-web/src/app/(studio)/studio/page.tsx` — studio dashboard at `/studio`
- `apps/career-web/src/app/(studio)/studio/checker/page.tsx`
- `apps/career-web/src/app/(studio)/studio/templates/page.tsx`
- `apps/career-web/src/app/(studio)/studio/portfolio/page.tsx`
- `apps/career-web/src/app/(studio)/studio/roadmap/page.tsx`
- `apps/career-web/src/app/(studio)/studio/roadmap/[slug]/page.tsx`
- `apps/career-web/src/app/(studio)/studio/job-match/page.tsx`

**Files modified:**
- `apps/career-web/src/app/page.tsx` — full landing page (was redirect)
- `apps/career-web/src/app/(studio)/layout.tsx` — auth-aware layout
- `apps/career-web/src/app/(studio)/page.tsx` — redirect to `/studio`
- `apps/career-web/src/app/(studio)/checker/page.tsx` — public product page
- `apps/career-web/src/app/(studio)/templates/page.tsx` — public templates showcase
- `apps/career-web/src/app/(studio)/portfolio/page.tsx` — public portfolio page
- `apps/career-web/src/app/(studio)/roadmap/page.tsx` — public roadmap page
- `apps/career-web/src/app/(studio)/job-match/page.tsx` — public job match page
- `apps/career-web/src/components/CareerShell.tsx` — nav links updated to `/studio/*`
- `apps/career-web/src/proxy.ts` — public routes expanded

**Landing page sections:**
1. Hero — headline, value prop, CTAs (ساخت رزومه + بررسی رزومه), mock resume preview, ATS score bar
2. Stats — ۸+ ابزار, ۴ قالب, ۱۰۰٪ رایگان, RTL
3. Features grid — 6 feature cards (Resume Builder, Checker, Public Profile, Portfolio, Roadmap, Job Match)
4. Templates showcase — 4 template cards with ATS/RTL/LTR badges
5. How it works — 3 steps (ثبت‌نام → ساخت → اشتراک‌گذاری)
6. For Irno students — Irno Hub integration (مهارت‌ها، مدارک، اعتبارنامه)
7. CTA — final dark gradient CTA section

**Design choices:**
- Background gradient blobs for hero
- Glass-style browser chrome mockup
- Feature cards with category-colored badges
- Premium template cards with mockup previews
- ATS score visualization
- Responsive mobile layout throughout

**Irno ID integration:**
- Login CTA → `/auth/login?app=career&from=<studio>` on hub-web
- Register CTA → `/auth/register?app=career&from=<studio>` on hub-web
- `NEXT_PUBLIC_HUB_WEB_URL` used everywhere — no hardcoded URLs

**Known limitations (Phase 17):**
- No AI, no payment gateway, no employer portal, no custom domain — intentional
- `/checker`, `/templates` etc. at public URL show product page; authenticated studio tool is at `/studio/checker` etc.
- `(studio)/page.tsx` and `app/page.tsx` both technically resolve to `/`; `app/page.tsx` takes precedence (Next.js behavior)
- Resume Checker product page clearly notes parser accuracy limitations (Phase 16.1 tech debt)
- Portfolio and Roadmap public pages are informational only — Phase 17 adds no new API endpoints

**Build/typecheck (Phase 17):**
- ✅ hub-api TypeScript: zero errors (no hub-api changes)
- ✅ career-web TypeScript: zero errors

---

### Next Phase to Implement: Phase 10 — Production Deployment & Hardening

**DO NOT start Phase 10 without explicit instruction.**

---

#### Phase 19 — Public Live Resume & Portfolio Deep Experience ✅

**Architecture principle: A user should be able to create a live career page and share it instead of constantly sending static PDF files.**

**No new Prisma migration needed in hub-api rebuild — apply `20260609000000_phase19_public_profile`:**
```bash
cd apps/hub-api
pnpm db:migrate:dev   # applies migration
pnpm db:generate      # regenerates Prisma client
```

**Migration adds:**
- `career_profiles`: `contactVisibilityConfig JSONB`, `publicThemeConfig JSONB`, `seoTitle VARCHAR(255)`, `seoDescription VARCHAR(500)`
- `resume_documents`: `allowPdfDownload BOOLEAN DEFAULT true`, `publicThemeConfig JSONB`
- `portfolio_projects`: `isFeatured BOOLEAN DEFAULT false`, `coverImageUrl VARCHAR(500)`, `demoUrl VARCHAR(500)`, `repoUrl VARCHAR(500)`, index on `isFeatured`

**New hub-api endpoints:**
- `PATCH /api/v1/career/profile/public-settings` — slug, visibility, contactVisibilityConfig, seoTitle, seoDescription. Reserved slug list enforced. Slug uniqueness enforced. Regex: `^[a-z0-9-]+$`.
- `POST /api/v1/career/portfolio/projects/reorder` — batch sortOrder update. Declared BEFORE `:id` route.
- `PATCH /api/v1/career/portfolio/projects/:id/featured` — toggle `isFeatured`
- `GET /api/v1/career/public/:slug` (improved) — returns full `PublicProfileDto`: contact (filtered by visibility config), portfolio projects (PUBLIC/PUBLIC_LINK only, featured first), certificates (if studentId linked), SEO fields, `allowPdfDownload` from resume

**New DTOs:**
- `update-public-settings.dto.ts` — validates slug (reserved words blocked, regex enforced), visibility, contactVisibilityConfig, SEO
- `reorder-portfolio-projects.dto.ts` — `{ items: { id, sortOrder }[] }` with `ValidateNested`

**Public profile visibility rules:**
- `PRIVATE` or `DISABLED` → 404 (no data leaked)
- `PUBLIC_LINK` → profile is accessible via direct URL
- Contact fields filtered by `contactVisibilityConfig` — phone hidden by default, email hidden by default
- Portfolio projects: only `PUBLIC_LINK` or `PUBLIC` visibility shown
- Certificates: only `ACTIVE` status shown; revoked not shown
- Private student data, payment data, internal notes never exposed

**Contact visibility defaults:**
```
showEmail: false, showPhone: false, showLocation: true,
showWebsite: true, showLinkedin: true, showGithub: true, showPortfolio: true
```

**career-web new/changed routes:**

| Route | Description |
|-------|-------------|
| `/public/[slug]` | Full premium public profile (rewritten) |
| `/u/[slug]` | Short URL alias — re-exports `/public/[slug]` page |
| `/portfolio` | Full portfolio management UI (replaced marketing page) |
| `/settings` | Full public settings UI (replaced placeholder) |
| `/studio/portfolio` | Redirects to `/portfolio` |

**Public profile page features:**
- `generateMetadata` — dynamic title/description, OpenGraph, `noindex` if 404
- Dark navy hero with avatar (initials fallback), display name, headline, target role, contact icons
- `ShareButton` (client component) — `navigator.share` or clipboard fallback
- `DownloadButton` (client component) — `window.print()` for PDF, only shown if `allowPdfDownload=true`
- Sticky anchor tab bar (درباره/تجربه/مهارت‌ها/تحصیلات/پروژه‌ها/مدارک) — only tabs for existing content
- Rich section renderers: SUMMARY, EXPERIENCE (timeline), EDUCATION, SKILL (grouped chips), PROJECT, LANGUAGE, CERTIFICATE, LINK, TEXT_BLOCK
- Portfolio projects section: 2-col grid, featured badge, cover image or gradient placeholder, tech chips, demo/repo links, `<details>` case study toggle
- Certificates section: verified badge, Persian date, "تایید مدرک" link to Hub verification
- Footer: Irno CV branding + link to career-web landing

**Portfolio management UI (`/portfolio`):**
- Full CRUD: create, edit, delete, reorder (up/down arrows), featured toggle (⭐)
- Project form modal: title, role, description, tech chips (Enter/comma), demo URL, repo URL, cover image URL, case study (challenge/solution/result), dates, visibility, featured
- Toast notifications for all actions
- Loading skeleton, empty state with CTA
- Visibility badges: خصوصی/با لینک/عمومی

**Settings page (`/settings`) sections:**
1. **پروفایل عمومی** — visibility toggle, slug input with URL preview, copy link button, open profile button
2. **کنترل حریم خصوصی تماس** — 7 toggle rows, saved independently
3. **تنظیمات SEO** — seoTitle + seoDescription with char counters
4. **Hub/Portal links** — compact grid
5. **Version info** — Phase 19

**CareerShell nav updated:**
- Portfolio href: `/studio/portfolio` → `/portfolio`
- Added "تنظیمات" nav item (gear icon) → `/settings`

**Shared packages updated:**
- `@irno/types`: `ContactVisibilityConfig` interface, `PublicProfileDto` (replaces `PublicResumeDto`, backward-compat alias kept), `PublicPortfolioProjectDto`, `PublicCertificateDto`, `UpdatePublicSettingsDto`, `ReorderPortfolioProjectsDto`, extended `CareerProfileDto`/`PortfolioProjectDto`/`ResumeDocumentDto`
- `@irno/i18n`: ~50 new keys in `fa.career` covering public settings, contact visibility, portfolio management, case study, share actions, SEO

**Public URL structure:**
- `/public/{slug}` — primary public profile URL
- `/u/{slug}` — short alias (same content)
- Custom domain (`cv.irno.academy/mahdi-asghari`) — FUTURE, not this phase

**Known limitations (Phase 19):**
- PDF download is browser-print only (`window.print()`) — no server-side PDF generation; noted clearly in UI
- Media/image upload not implemented — `coverImageUrl` accepts URL only; file upload requires storage service (future)
- Custom domain support is future
- Public profile theme customization stored but not rendered (future skin/theme engine)
- `contactVisibilityConfig` / new schema fields use `(p as any).field` pattern until `pnpm db:generate` runs after migration
- No QR code on public profile — verification URL is text link only
- No public portfolio search/discovery — profiles are linked by direct URL only
- No employer portal, no job marketplace

**Build/typecheck (Phase 19):**
- ✅ hub-api TypeScript: zero errors
- ✅ career-web TypeScript: zero errors
- ✅ @irno/types: zero errors
- ✅ @irno/i18n: zero errors

---

#### Phase 20 — Export & PDF Production Hardening ✅

**Goal:** Make Irno CV export production-quality. Production HTML snapshots suitable for browser viewing, Ctrl+P/Save as PDF, and ATS submission. No broken renderers, no raw JSON fallback.

**Migration:** `20260612000000_phase20_export_hardening`
```bash
cd apps/hub-api
pnpm db:migrate:dev   # adds errorMessage TEXT to resume_exports
pnpm db:generate      # regenerates Prisma client
```

**Migration adds to `resume_exports`:**
- `errorMessage TEXT` — stores the error reason when status=FAILED

**Schema change:** `apps/hub-api/prisma/schema.prisma` — `errorMessage String? @db.Text` added to `ResumeExport` model.

---

**Backend — `apps/hub-api/src/career/career-export.service.ts` (rewritten):**

HTML snapshot features:
- **All section types rendered correctly** — no raw JSON `<pre>` fallback:
  - `SUMMARY`, `TEXT_BLOCK`, `CUSTOM` — plain text paragraph
  - `EXPERIENCE` — `content.items` (was `content.entries`); renders role, company, location, dates, description, achievements (bullets), technologies (chips)
  - `EDUCATION` — `content.items`; renders institution, degree, field, dates, GPA
  - `SKILL` — `content.groups`; renders grouped chips (label + skills array); fallback to flat `content.skills`
  - `PROJECT` — `content.items`; renders title, role, description, technologies, demoUrl, repoUrl
  - `CERTIFICATE` — `content.items` (was `content.certificates`); renders title, issuer, issuedAt, credentialId, verificationUrl
  - `LANGUAGE` — `content.items`; renders language name + level
  - `LINK` — `content.items` (was `content.links`); renders label + safe href
  - Unknown types — renders `content.text` if present; otherwise "بدون محتوا" placeholder
- **True diagonal background watermark** — `position: absolute; inset: 0` container with `transform: rotate(-35deg)` large text; not `position: fixed` (which does not print correctly)
- **RTL/LTR support** — `resume.language === 'EN'` → `dir="ltr"` + Inter font; FA/FA_EN → `dir="rtl"` + Vazirmatn
- **Template-aware CSS** — `ATS_FRIENDLY` (clean, classic), `MODERN_MINIMAL` (border-left section titles), `TECHNICAL` (monospace section titles, dark tech tags), `ACADEMIC` (smaller section titles, 1px border)
- **Accent color** from `resume.styleConfig.accentColor` — used on name, section titles, links, bullets, chips
- **Font size / spacing** from `resume.styleConfig` — small/normal/large × compact/normal/comfortable
- **A4 print CSS** — `@media print` with `@page { size: A4; margin: 0 }` and `.page { padding: 20mm 18mm }`
- **Security** — all user content runs through `escapeHtml()` — no XSS from resume data
- **errorMessage stored** — try/catch around generation; FAILED status + errorMessage written to DB if generation throws
- **userId + templateId** set in export `create` data (was missing before)
- **Ownership check** via `resolveResumeOwnership()` — verifies `careerProfile.userId` matches caller

**New service methods:**
- `getExport(resumeId, exportId, userId)` — single export detail
- `downloadExport(resumeId, exportId, userId)` — returns `{ html, filename }` for controller to stream

---

**Backend — `apps/hub-api/src/career/career-export.controller.ts` (updated):**

New endpoints added:
```
GET /api/v1/career/resumes/:id/exports/:exportId           — single export metadata
GET /api/v1/career/resumes/:id/exports/:exportId/download  — streams HTML as attachment file
```

`download` endpoint sets:
- `Content-Type: text/html; charset=utf-8`
- `Content-Disposition: attachment; filename="irno-cv-<resumeHash>-<exportHash>.html"`
- `Cache-Control: no-store`
- `X-Content-Type-Options: nosniff`

---

**Frontend — `apps/career-web/src/app/(studio)/resumes/[id]/ResumeEditorWorkspace.tsx` (ExportPanel updated):**

- `ExportHistoryItem` type — now includes `status: 'PENDING' | 'GENERATED' | 'FAILED'` and `errorMessage?: string | null`
- History rows show status badges: ✓ آماده (green) / ⏳ در صف (yellow) / ✕ خطا (red)
- Download link only shown for GENERATED exports
- FAILED exports show `errorMessage` below the row
- `download` attribute on download anchor — triggers proper file download instead of browser navigation

---

**Frontend — `apps/career-web/src/app/public/[slug]/DownloadButton.tsx` (updated):**

- Adds `showHint` state: after click, shows "در پنجره چاپ، «Save as PDF» را انتخاب کنید." hint below button
- 100ms delay before `window.print()` so hint renders before print dialog blocks UI
- Behavior unchanged (browser-print workflow); hint makes the workflow clear to users

---

**Build/typecheck (Phase 20):**
- ✅ hub-api TypeScript: zero errors
- ✅ career-web TypeScript: zero errors

**Known limitations (Phase 20):**
- Server-side PDF generation (puppeteer/playwright) not implemented — HTML export + Ctrl+P/Save as PDF is the workflow; documented clearly in UI
- `download` attribute on `<a>` for HTML export works in modern browsers; Safari may open inline instead of downloading — acceptable limitation
- Google Fonts (`Vazirmatn`, `Inter`) loaded via `@import url(...)` in exported HTML — requires network on first render; fonts fall back to system fonts offline
- Watermark is CSS-only diagonal text — does not add literal text to ATS-parsed content; ATS systems only parse visible text nodes, not CSS
- Export files are stored as `htmlSnapshot TEXT` in PostgreSQL — very large resumes (many sections, long descriptions) may be large; acceptable for MVP
- PDF print quality depends on browser; Chrome/Edge produce best results with "Background graphics" print option enabled

---

#### Phase 20.1 — Real Server-Side PDF Export (Playwright) ✅

**Goal:** Replace browser-print workflow with real server-side PDF generation using Playwright Chromium. Users can now export a true PDF directly from the Editor ExportPanel and download it from the public profile page.

**No new Prisma migration needed** — `ResumeExportFormat.PDF` already in schema, `fileUrl String?` already on `ResumeExport`.

---

**New dependency:**

```bash
# In apps/hub-api/
pnpm add playwright

# After install — must be run once per machine / deployment environment
npx playwright install chromium

# On Linux/Docker — also install OS-level dependencies
npx playwright install-deps chromium
# Or manually: libgtk-3-0 libnss3 libxss1 libatk-bridge2.0-0 libdrm2 libxkbcommon0
```

---

**New file: `apps/hub-api/src/career/career-pdf.service.ts`**

- `CareerPdfService` implements `OnModuleDestroy`
- Singleton Playwright Chromium browser — lazily launched on first PDF request, reused across requests
- `getBrowser()` — launches with `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu` (Docker/VPS safe)
- `generatePdf(html: string): Promise<Buffer>` — `page.setContent(html, { waitUntil: 'networkidle', timeout: 15000 })` + `page.pdf({ format: 'A4', printBackground: true })`
- Browser auto-relaunches if it crashes (`isConnected()` guard)
- `onModuleDestroy` closes browser cleanly on NestJS shutdown
- `// @ts-ignore` on dynamic import — playwright is present at runtime but not in sandbox typecheck

---

**Watermark change (affects both HTML and PDF export):**

In `career-export.service.ts`, the watermark container was changed from `position: absolute; inset: 0` to `position: fixed; inset: 0`:
- `position: absolute` only renders watermark on the first page in Playwright PDF output
- `position: fixed` repeats watermark on every page (correct for A4 multi-page PDFs)
- The `.page` div no longer uses `overflow: hidden` (was clipping the fixed watermark)
- Watermark HTML block is placed outside/before the `.page` div in the body

---

**Storage: PDF files on local filesystem**

- Storage base: `process.env.EXPORT_STORAGE_PATH ?? path.join(process.cwd(), 'storage', 'exports')`
- File path: `{storageBase}/{userId}/{exportId}.pdf`
- `fileUrl` on `ResumeExport` stores relative path `{userId}/{exportId}.pdf`
- `resolveAbsoluteFromRelative()` joins base + relative path; path traversal check via `path.resolve()` comparison
- `.gitignore` excludes `apps/hub-api/storage/exports/*` (git-keeps placeholder `.gitkeep`)
- **Production note**: mount `storage/exports` as a persistent volume (Docker) or bind-mount in VPS deployment

---

**Updated: `apps/hub-api/src/career/dto/create-export.dto.ts`**
- `format?: 'HTML' | 'PDF'` (was `'HTML'` only)
- Validation: `@IsIn(['HTML', 'PDF'])`

---

**Updated: `apps/hub-api/src/career/career-export.service.ts`**

`triggerExport` now handles both formats:
- `PDF`: calls `careerPdfService.generatePdf(htmlSnapshot)` → writes buffer to disk → stores relative path in `fileUrl`
- `HTML`: unchanged (stores `htmlSnapshot` in DB)

`downloadExport` returns discriminated union:
- `PDF`: reads file from disk via `fs.readFile(resolvedPath)` → returns `{ format: 'PDF', buffer, filename }`
- `HTML`: returns `{ format: 'HTML', html, filename }`

New public methods:
- `getExport(resumeId, exportId, userId)` — single export metadata
- `downloadExport(resumeId, exportId, userId)` — discriminated union result
- `getPublicResumeDownload(slug)` — full public download flow (visibility check → `allowPdfDownload` check → latest GENERATED PDF → read file → `{ buffer, filename }`)

---

**Updated: `apps/hub-api/src/career/career-export.controller.ts`**

- `downloadExport` endpoint routes content-type from discriminated union result:
  - PDF → `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="{name}.pdf"`
  - HTML → `Content-Type: text/html; charset=utf-8`, `Content-Disposition: attachment; filename="{name}.html"`
- New: `GET /api/v1/career/resumes/:id/exports/:exportId` — single export metadata
- New: `GET /api/v1/career/resumes/:id/exports/:exportId/download` — file download

---

**Updated: `apps/hub-api/src/career/career-profile.controller.ts`**

New public endpoint:
```
GET /api/v1/career/public/:slug/resume/download   [@Public]
  → Returns latest GENERATED PDF for the profile
  → Content-Type: application/pdf
  → Cache-Control: public, max-age=300
  → 404 if no PDF available
```

---

**Updated: `apps/hub-api/src/career/career.service.ts`**

`getPublicResume()` now checks for a GENERATED PDF export and adds `hasPdfExport: boolean` to the resume object in the response. Frontend reads this flag to decide whether to show a real PDF download link or fall back to browser print.

---

**Updated: `apps/career-web` — ExportPanel in `ResumeEditorWorkspace.tsx`**

- `selectedFormat` state (`'HTML' | 'PDF'`, default `'HTML'`)
- Format toggle (two-button pill — 📄 PDF / 🌐 HTML)
- Format description row below toggle
- Dynamic button label: «⬇ دریافت PDF» / «⬇ دریافت HTML»
- PDF loading message: «⏳ در حال تولید PDF (۵–۱۵ ثانیه)...»
- PDF time-estimate info card shown when PDF selected
- Chromium install hint shown in error message when PDF generation fails
- History rows now show format badge (PDF = red, HTML = slate)
- Removed old "Ctrl+P for PDF" notice card

---

**Updated: `apps/career-web` — `DownloadButton.tsx` + `public/[slug]/page.tsx`**

`DownloadButton` now accepts `slug` and `hasPdfExport` props:
- `hasPdfExport=true` → renders `<a href="/api/v1/career/public/{slug}/resume/download" download>دریافت PDF</a>`
- `hasPdfExport=false` → falls back to `window.print()` with "Save as PDF" hint

`page.tsx` passes `slug={slug}` and `hasPdfExport={(resume as any).hasPdfExport ?? false}`.

---

**New env var (`apps/hub-api/.env`):**
```
EXPORT_STORAGE_PATH=           # Optional. Default: {cwd}/storage/exports. Set to absolute path in production.
```

---

**Build/typecheck (Phase 20.1):**
- ✅ hub-api TypeScript: zero errors
- ✅ career-web TypeScript: zero errors

---

**Manual verification checklist:**
1. `pnpm add playwright` in `apps/hub-api/` + `npx playwright install chromium`
2. Restart hub-api → Chromium browser starts lazily on first PDF request
3. ExportPanel shows HTML/PDF toggle — default HTML
4. Select PDF → button shows «⬇ دریافت PDF», time-estimate card appears
5. Click «دریافت PDF» → POST with `{ format: 'PDF' }` → 5–15s → success card with «دانلود PDF ↓»
6. Download anchor triggers real `.pdf` file download (not HTML)
7. Open PDF — text is selectable, watermark appears on every page, A4 format
8. Select HTML → button shows «⬇ دریافت HTML» → downloads `.html` file (unchanged behaviour)
9. Export history shows PDF badge (red) vs HTML badge (slate) per item
10. Public profile: if PDF exported, «دریافت PDF» link → real file download
11. Public profile: if no PDF exported, «دریافت PDF» → window.print() + hint
12. `GET /api/v1/career/public/:slug/resume/download` returns `application/pdf`
13. Playwright browser crash → next request relaunches browser automatically
14. Server shutdown → `onModuleDestroy` closes browser cleanly
15. `EXPORT_STORAGE_PATH` env var respected for custom storage location

**Known limitations (Phase 20.1):**
- `npx playwright install chromium` must be run manually after every fresh `pnpm install` on CI/production — not automated in postinstall script
- Chromium download is ~120MB; cache it in CI between builds
- `waitUntil: 'networkidle'` with 15s timeout: if Google Fonts CDN is unreachable (air-gapped environment), PDF generation will timeout; embed fonts locally as future hardening
- Storage is local filesystem only — PDF files not served via CDN; add object storage (S3/R2) in Phase 10 production hardening
- Concurrent PDF exports use separate browser pages but share one Chromium process; under very high concurrency, add a queue (Bull/BullMQ) in future
- `position: fixed` watermark in Playwright PDF: works correctly for multi-page PDFs; if HTML is opened in browser (non-print view), watermark appears as overlay (expected)
- `hasPdfExport` cast in `page.tsx` uses `as unknown as { hasPdfExport?: boolean }` — remove cast when `PublicProfileDto.resume` type is updated to include `hasPdfExport`

---

#### Phase 20.2 — PDF Export Concurrency Guard ✅

**Goal:** Prevent Playwright/Chromium from being overloaded by concurrent PDF export requests. Add an in-process semaphore, configurable queue, and hard timeout — all with Persian-language error messages.

**No new Prisma migration needed** — `errorMessage TEXT` was added in Phase 20 migration `20260612000000_phase20_export_hardening`.

---

**New class: `PdfSemaphore`** (inside `apps/hub-api/src/career/career-pdf.service.ts`)

FIFO in-process semaphore:
- `concurrency` slots run simultaneously (Chromium pages open in parallel)
- Additional jobs queue in FIFO order up to `queueMax`
- When `queueMax` is exceeded: throws `PdfQueueFullError` immediately (no blocking)
- Each `acquire()` must be paired with `release()` in a `finally` block

**Custom error types** (same file):
- `PdfQueueFullError` — thrown when queue is at capacity → HTTP 429
- `PdfTimeoutError` — thrown when job exceeds `PDF_EXPORT_TIMEOUT_MS` → HTTP 504
- `PdfDisabledError` — thrown when `PDF_EXPORT_ENABLED=false` → HTTP 503

**Env vars (hub-api `.env`):**
```
PDF_EXPORT_ENABLED=true       # 'false' disables all PDF generation with 503
PDF_EXPORT_CONCURRENCY=1      # max simultaneous Chromium pages (1–10)
PDF_EXPORT_QUEUE_MAX=5        # max jobs waiting; beyond → 429 Persian error
PDF_EXPORT_TIMEOUT_MS=30000   # per-job hard deadline in ms (5000–120000)
```

**Semaphore/queue behavior:**
- On `generatePdf()` call: `semaphore.acquire()` is called first
- If `running < concurrency`: slot granted immediately, job starts
- If `running >= concurrency` and `waiters.length < queueMax`: job waits in FIFO queue
- If `waiters.length >= queueMax`: `PdfQueueFullError` thrown → caught in `triggerExport` → DB record set to FAILED with Persian error → HTTP 429 returned to client
- `release()` in `finally` block always wakes the next waiter or decrements `running`

**Timeout behavior:**
- `runWithTimeout(fn, ms)` wraps `generatePdfInternal()` in a race with `setTimeout`
- If timeout fires first: `PdfTimeoutError` thrown
- Playwright does not have a cancel API — the underlying page eventually closes via `generatePdfInternal`'s own `finally { page.close() }` block
- `PdfTimeoutError` is caught in `triggerExport` → DB record set to FAILED with errorMessage `'تولید PDF بیش از حد مجاز طول کشید. لطفاً دوباره تلاش کنید.'`
- Export is **never left in PENDING state** — catch block always writes FAILED

**Playwright page lifecycle:**
- `generatePdfInternal()` opens a new Playwright page and always closes it in `finally { page.close().catch(() => {}) }`
- Browser is singleton — lazily launched, reused across requests
- `onModuleDestroy` closes browser cleanly on NestJS shutdown
- If browser crashes between requests: `getBrowser()` detects `!browser.isConnected()` and relaunches

**HTTP error mapping (in `triggerExport`):**
| Error type | HTTP status | Persian message |
|---|---|---|
| `PdfQueueFullError` | 429 | در حال حاضر چند خروجی PDF در حال آماده‌سازی است. لطفاً چند لحظه دیگر دوباره تلاش کنید. |
| `PdfTimeoutError` | 504 | تولید PDF بیش از حد مجاز طول کشید. لطفاً دوباره تلاش کنید. |
| `PdfDisabledError` | 503 | خروجی PDF در حال حاضر غیرفعال است. لطفاً از خروجی HTML استفاده کنید. |
| Other error | 500 | err.message |

**HTML export isolation:**
- HTML generation is instant (string generation, no Playwright) — completely unaffected by semaphore
- `generatePdf()` (Playwright) is only called when `format === 'PDF'`
- HTML path skips `careerPdfService` entirely

**UI behavior:**
- ExportPanel reads `status` on each history row: GENERATED → download link; FAILED → `✕ خطا` badge + `errorMessage` text
- HTTP 429 → Persian UI message displayed, no success shown
- HTTP 503 → suggests HTML fallback
- HTTP 504 → suggests retry

**Files changed (Phase 20.2):**
- `apps/hub-api/src/career/career-pdf.service.ts` — `PdfSemaphore` class, `PdfQueueFullError`, `PdfTimeoutError`, `PdfDisabledError` error types, `isEnabled()`, `getTimeoutMs()`, `getEnvInt()`, updated `generatePdf()` with acquire/release, `runWithTimeout()`
- `apps/hub-api/src/career/career-export.service.ts` — error catch block maps all three error types to correct HTTP status + Persian message + FAILED DB record

**Build/typecheck (Phase 20.2):**
- ✅ hub-api TypeScript: zero errors
- ✅ career-web TypeScript: zero errors

**Known limitations (Phase 20.2):**
- In-process semaphore only — multiple hub-api instances (horizontal scale) do NOT share the semaphore; each process enforces its own limit independently
- Under horizontal scaling, total concurrency = `PDF_EXPORT_CONCURRENCY × numInstances`; add a Redis-backed distributed semaphore or BullMQ queue in Phase 10 production hardening
- No queue position feedback to client — client receives 429 immediately when queue is full; no "you are #3 in queue" response
- Playwright cancel API does not exist — timed-out jobs still complete their Playwright page lifecycle (page.close() eventually called), consuming a small amount of memory until that happens
- Storage is local filesystem (`storage/exports/`) — not replicated across instances; in production use a shared volume (NFS/EFS) or migrate to object storage (S3/R2)

**Future work (BullMQ/separate worker):**
- Replace in-process semaphore with BullMQ job queue backed by Redis
- Separate PDF worker process (`apps/pdf-worker/`) that reads jobs from BullMQ queue and runs Playwright
- Hub API enqueues PDF jobs and returns job ID immediately (async export)
- Client polls `/exports/:id` or uses WebSocket for completion notification
- Worker can be scaled independently of hub-api HTTP processes
- This decouples PDF generation (slow, memory-heavy) from HTTP request handling (fast, low-memory)

---

#### Phase 18.3 — Job Match External Resume Support ✅

**Goal:** Extend Job Match so users can analyse any resume against a job description — not just resumes already built inside Irno CV. Three input modes added; existing IRNO_RESUME mode unchanged.

**Migration:** `20260612100000_phase18_3_job_match_external`
```bash
cd apps/hub-api
pnpm db:migrate:dev   # adds 4 new columns to job_match_reports
pnpm db:generate      # regenerates Prisma client
```

Migration adds to `job_match_reports` (all idempotent `IF NOT EXISTS`):
- `sourceType VARCHAR(50) NOT NULL DEFAULT 'IRNO_RESUME'`
- `sourceFileName VARCHAR(500)`
- `sourceTextSnapshot TEXT`
- `targetRole VARCHAR(200)`
- `CREATE INDEX IF NOT EXISTS "job_match_reports_sourceType_idx"` on `sourceType`

---

**Three resume source modes:**

| Mode | sourceType | How resume is provided |
|------|-----------|------------------------|
| Irno Resume | `IRNO_RESUME` | `resumeDocumentId` → sections extracted from DB |
| Pasted Text | `PASTED_TEXT` | `resumeText` field in JSON body |
| Uploaded File | `UPLOADED_FILE` | multipart `file` (PDF or TXT) to `/upload` endpoint |

Rules:
- Providing both `resumeDocumentId` and `resumeText` → 400
- JD-only mode (neither): analysis runs with empty resume text, advisory note added
- `sourceType` is auto-determined by backend when not provided
- `sourceFileName` is set by controller from `file.originalname` — never read from JSON body

---

**New backend endpoints:**

```
POST /api/v1/career/job-match/upload   [Authenticated]
  Request: multipart/form-data
    file           — PDF (selectable text) or TXT, max 5 MB
    jobDescription — required, min 30 chars
    jobTitle       — optional
    targetRole     — optional
  Returns: JobMatchReportDto
  Errors:
    400 — missing file, bad file type, jd too short, scanned PDF
```

Existing:
```
POST /api/v1/career/job-match   — JSON body (IRNO_RESUME or PASTED_TEXT)
GET  /api/v1/career/job-match   — list current user's reports
```

---

**Files changed (Phase 18.3):**

- `apps/hub-api/prisma/migrations/20260612100000_phase18_3_job_match_external/migration.sql` — idempotent migration
- `apps/hub-api/prisma/schema.prisma` — 4 new fields + sourceType index on `JobMatchReport`
- `apps/hub-api/src/career/resume-checker.service.ts`:
  - Added `extractResumeTextFromFile(buffer, mimeType, originalName): string` — public wrapper
  - Added `sanitiseResumeText(resumeText: string): string` — public wrapper
  - No existing methods modified
- `apps/hub-api/src/career/dto/create-job-match.dto.ts` — full rewrite: added `resumeText`, `sourceType`, `sourceFileName`, `targetRole`; backward-compat `resumeId` alias kept
- `apps/hub-api/src/career/career.service.ts`:
  - Imported `ResumeCheckerService` (injected)
  - Rewrote `createJobMatch()` — handles all 3 modes, persists new fields, derives `matchedKeywords`/`missingKeywords`
  - Updated `mapJobMatchReport()` — includes new fields; derives matched/missing from `skillGap` for old records
- `apps/hub-api/src/career/job-match.controller.ts` — complete rewrite: injects `ResumeCheckerService`, added `POST /upload` with `FileInterceptor` (5 MB limit, PDF/TXT filter)
- `packages/types/src/career.ts`:
  - `JobMatchReportDto` — added `sourceType`, `sourceFileName`, `targetRole`, `matchedKeywords`, `missingKeywords`; `recommendations` changed to `string[]`
  - `CreateJobMatchDto` — added `resumeText?`, `sourceType?`, `sourceFileName?`, `targetRole?`
- `apps/career-web/src/app/(studio)/studio/job-match/page.tsx` — complete rewrite: 3-tab UI

---

**Job Match engine changes:**

- Text extraction for UPLOADED_FILE: same `extractPdfText()` logic already used in Resume Checker
- Keyword matching: same `computeKeywordMatch` engine used in Resume Checker (rule-based, deterministic)
- `matchedKeywords` and `missingKeywords` are returned directly in the API response (not just in `skillGap`)
- Old reports (no `matchedKeywords` column): `mapJobMatchReport()` derives them from `skillGap` JSON — backward compatible
- `recommendations` array is populated from missing keywords as actionable advice strings

---

**Frontend UI (career-web job-match page):**

- 3-tab mode selector: «رزومه‌های من» / «آپلود رزومه» / «چسباندن متن رزومه»
- Tab 1 (Irno Resume): dropdown of user's saved resumes (optional), falls back to JD-only
- Tab 2 (Upload): drag-drop file picker, client-side type/size validation, scanned PDF warning card, selected file display with clear button
- Tab 3 (Paste): textarea with char count, min-length validation hint
- Common fields: jobDescription textarea (char counter, min/max indicator), jobTitle, targetRole
- Result display: score circles (overallScore, keywordScore), matched keyword green chips, missing keyword red chips, recommendations list
- Report history: source badge, filename, score circle, date
- Error banner: surfaces backend 400 messages directly in Persian
- No raw JSON shown anywhere

---

**Security checks:**

- `sourceFileName` set by controller from `file.originalname` only — never accepted from JSON body in a privileged way
- File content never written to disk — in-memory processing only (`buffer`)
- File type validated both by client (extension) and server (mimetype + extension double-check in `fileFilter`)
- Max file size: 5 MB enforced by `MulterModule` limits
- All reports scoped to current user's `careerProfileId` — `userId` always from JWT
- `sourceTextSnapshot` stores first 5000 chars only — never full text in DB

---

**Manual verification checklist (17 items):**

1. ✅ `POST /career/job-match` with `resumeDocumentId` → IRNO_RESUME report created, sections extracted
2. ✅ `POST /career/job-match` with `resumeText` → PASTED_TEXT report, `sourceTextSnapshot` stored (first 5000 chars)
3. ✅ `POST /career/job-match` with both `resumeDocumentId` + `resumeText` → 400
4. ✅ `POST /career/job-match` with neither → JD-only mode (no error)
5. ✅ `POST /career/job-match/upload` with valid PDF → UPLOADED_FILE report, `sourceFileName` set
6. ✅ `POST /career/job-match/upload` with TXT file → text read, report created
7. ✅ `POST /career/job-match/upload` with scanned PDF (no text) → 400 with Persian error
8. ✅ `POST /career/job-match/upload` with file > 5 MB → 400 (Multer limit)
9. ✅ `POST /career/job-match/upload` with `.docx` → 400 (file filter rejects)
10. ✅ `POST /career/job-match` with `jobDescription` < 30 chars → 400 with Persian error
11. ✅ `GET /career/job-match` → reports list includes `sourceType`, `matchedKeywords`, `missingKeywords`
12. ✅ Old report (no sourceType column) → `mapJobMatchReport` derives matched/missing from `skillGap`, returns valid DTO
13. ✅ Career-web tab 1: resume dropdown loads, POST JSON, result with chips shown
14. ✅ Career-web tab 2: file picker, file name displayed after selection, upload POST, scanned PDF shows error
15. ✅ Career-web tab 3: textarea with char count, min-length indicator, paste mode POST
16. ✅ Result card: matched keywords green chips, missing keywords red chips, score circles, recommendations
17. ✅ Report history rows show sourceType badge, sourceFileName, score, date

---

**Build/typecheck (Phase 18.3):**
- ✅ hub-api TypeScript: zero errors
- ✅ career-web TypeScript: zero errors
- ✅ @irno/types: compiled clean

---

**Known limitations (Phase 18.3):**
- PDF extraction is regex-based (same as Resume Checker) — scanned/encrypted PDFs return 400; no OCR
- DOCX not supported — user must save as PDF or copy-paste text
- `resumeId` alias (backward compat) is accepted but not documented in UI — remove in Phase 10 cleanup
- No rate limiting on upload endpoint beyond Multer file size
- `sourceTextSnapshot` truncates at 5000 chars — full text never stored; this means re-scoring from snapshot is not possible
- `matchedKeywords`/`missingKeywords` are keyword-match only (rule-based) — no semantic/AI understanding
- Older `JobMatchReport` rows missing `sourceType` column: `DEFAULT 'IRNO_RESUME'` applied at migration time; `mapJobMatchReport` handles `null` skillGap gracefully

---

#### Phase 21 — Portfolio Case Study Builder ✅

**Goal:** Elevate portfolio projects into full case study pages. Each project can now document the problem, solution, impact, and responsibilities as structured text — giving the public profile depth beyond a simple project card.

**Migration:** `20260613000000_phase21_portfolio_casestudy`
```bash
cd apps/hub-api
pnpm db:migrate:dev   # adds 11 new columns + unique index to portfolio_projects
pnpm db:generate      # regenerates Prisma client
```

**Migration adds to `portfolio_projects` (all idempotent `IF NOT EXISTS`):**
- `slug VARCHAR(200)` — URL-friendly identifier auto-generated from title
- `clientName VARCHAR(200)` — client or company name
- `summary TEXT` — one-paragraph project summary
- `problem TEXT` — problem the project solved
- `solution TEXT` — technical/design approach taken
- `impact TEXT` — measurable outcomes and results
- `responsibilities JSONB` — ordered list of responsibilities (string[])
- `mediaUrls JSONB` — screenshot/media URLs (string[])
- `projectType VARCHAR(100)` — e.g. personal/work/open-source/educational/enterprise
- `seoTitle VARCHAR(255)` — per-project SEO title
- `seoDescription VARCHAR(500)` — per-project SEO description
- Unique partial index on `(careerProfileId, slug)` where slug IS NOT NULL AND deletedAt IS NULL

**New backend methods:**
- `generatePortfolioSlug()` — auto-generates slug from title, resolves conflicts with `-2`, `-3`, ... suffixes, falls back to timestamp after 50 attempts
- `getPortfolioProject(userId, projectId)` — get single project with ownership check
- `getPublicPortfolioProject(profileSlug, projectSlug)` — public access, enforces profile/project visibility
- `mapPublicPortfolioProject()` — dedicated mapper for public responses

**New backend endpoints:**
```
GET /api/v1/career/portfolio/projects/:id              — single project (authenticated owner)
GET /api/v1/career/public/:slug/projects/:projectSlug  [@Public] — public project detail
```

**Shared packages updated:**
- `@irno/types`: `PortfolioProjectDto`, `CreatePortfolioProjectDto`, `UpdatePortfolioProjectDto`, `PublicPortfolioProjectDto` all extended with 11 new fields
- `@irno/i18n`: `fa.career.portfolioProject.*` extended with `myRole`, `clientName`, `summary`, `problem`, `solution`, `impact`, `responsibilities`, `mediaUrls`, `projectType`, `featured`, `projectTypes` sub-object

**career-web portfolio management UI (`/portfolio`) — rewritten:**
- Project creation/edit modal now has 5 tabs:
  1. **اطلاعات اصلی** — title, role, client, dates, description
  2. **کیس استادی** — problem, solution, responsibilities list editor, impact
  3. **تکنولوژی‌ها** — tech chip editor with Enter/comma input
  4. **لینک‌ها** — demo, repo, cover image, media URLs list editor
  5. **نمایش** — visibility, featured, SEO title/description, projectType
- Project cards show: clientName, projectType badge, summary/impact callout, case study indicator badge

**career-web public profile (`/public/[slug]`) — updated `PortfolioCard`:**
- Shows role + clientName in same row
- Uses `summary` field preferentially (falls back to truncated description)
- Shows `impact` in emerald callout box
- Expandable case study shows `problem`, `solution`, `responsibilities` bulleted list, `impact`
- Backward-compatible with legacy `caseStudy` JSON field (challenge/solution/result)

**New public project detail page:**
- Route: `/public/[slug]/projects/[projectSlug]`
- `generateMetadata` — dynamic SEO title/description, OpenGraph
- Back button → public profile
- Hero: title, role, clientName, dates, projectType badge, demo/repo CTAs
- Summary, Problem, Solution, Responsibilities, Technologies, Impact sections
- Media gallery: images rendered as `<img>`; non-image URLs as links
- Backward-compatible legacy case study rendering
- `noindex` on 404

**Security (enforced):**
- `getPortfolioProject` always verifies `careerProfile.userId === user.id` — ownership enforced
- `getPublicPortfolioProject` returns 404 for PRIVATE/DISABLED profiles
- Project visibility filter: only PUBLIC/PUBLIC_LINK projects shown publicly
- `seoTitle`, `seoDescription`, `slug` only accepted in DTO — never derived from request headers or external input
- `sourceFileName` pattern from Phase 18.3 NOT applicable here — no file upload in Phase 21

**Files changed (Phase 21):**
- `apps/hub-api/prisma/migrations/20260613000000_phase21_portfolio_casestudy/migration.sql` — new migration
- `apps/hub-api/prisma/schema.prisma` — 11 new fields + index on `PortfolioProject` model
- `apps/hub-api/src/career/career.service.ts` — `generatePortfolioSlug`, `getPortfolioProject`, `getPublicPortfolioProject`, `mapPublicPortfolioProject`; create/update/list/map updated for new fields
- `apps/hub-api/src/career/portfolio.controller.ts` — added `GET :id` (after `/reorder`)
- `apps/hub-api/src/career/career-profile.controller.ts` — added `GET public/:slug/projects/:projectSlug`
- `apps/hub-api/src/career/dto/create-portfolio-project.dto.ts` — 11 new fields with validators
- `apps/hub-api/src/career/dto/update-portfolio-project.dto.ts` — 11 new fields (all optional)
- `packages/types/src/career.ts` — all portfolio DTOs extended
- `packages/i18n/src/fa.ts` — `portfolioProject` section extended
- `apps/career-web/src/app/(studio)/portfolio/page.tsx` — full rewrite with 5-tab modal
- `apps/career-web/src/app/public/[slug]/page.tsx` — `PortfolioCard` rewritten
- `apps/career-web/src/app/public/[slug]/projects/[projectSlug]/page.tsx` — new public project detail page
- `apps/career-web/src/lib/api.ts` — added `getPublicPortfolioProject()` helper

**Build/typecheck (Phase 21):**
- ✅ hub-api TypeScript: zero errors
- ✅ career-web TypeScript: zero errors

**Known limitations (Phase 21):**
- `slug` auto-generated on create; no slug edit UI in Phase 21 — to rename slug, delete and recreate the project or add an edit field in a future polish pass
- `(dto as any).fieldName` and `(p as any).fieldName` pattern used throughout career.service.ts until `pnpm db:generate` regenerates the Prisma client after migration
- No drag-and-drop for responsibilities or mediaUrls lists — Enter-to-add chip editors only
- Media URLs are display-only (no upload) — file upload requires object storage (future Phase 10)
- `projectType` is a free-text `VARCHAR(100)` — the 5 preset types are frontend-side constants only; no DB enum constraint
- Public project detail page has no `/u/[slug]/projects/[projectSlug]` short-URL alias — add if needed
- SEO metadata per project uses static `generateMetadata` — no streaming/suspense metadata; acceptable for MVP

---

#### Phase 18.2 — Auth Redirect Priority Fix (Career Studio + Meetino) ✅

**Goal:** Fix post-login redirect so Career Studio CTAs and Meetino SSO correctly return users to the app they came from, regardless of Hub role (ADMIN/SUPER_ADMIN must not be force-redirected to `/dashboard`).

**No new Prisma migration — code-only fixes.**

---

**Root causes fixed:**

1. `proxy.ts` — authenticated users on auth pages had no `from`-path handling and no `app=meetino` handling; always fell to `/dashboard`.
2. Login/register forms — `app=meetino` with no `from` had no SSO fallback; fell to role-based default.
3. `IrnoIdLoginForm.tsx` — `OtpLoginPanel.handleVerifyOtp` referenced `returnTo`, `app`, `from` out-of-scope; fixed by adding `onNeedsProfile(mobile)` callback pattern.

---

**Redirect priority (universal, enforced in proxy.ts and all auth forms):**

```
1. valid returnTo (absolute URL, allowlisted) → cross-app absolute redirect
2. hub-internal `from` path (e.g. /sso/meetino?redirect_uri=...) → router.push
3. app context default: app=career → career-web/studio; app=meetino → /sso/meetino
4. role-based Hub default: staff → /dashboard; others → /portal
```

---

**Files changed (Phase 18.2):**

- `apps/hub-web/src/proxy.ts`:
  - Added `MEETINO_CALLBACK_URL` constant (env `NEXT_PUBLIC_MEETINO_CALLBACK_URL`, default `http://localhost:3001/auth/irno/callback`)
  - Added Priority 2: `from` (hub-internal) redirect for authenticated users on auth pages
  - Added `app=meetino` handling (Priority 3): redirects to `/sso/meetino?redirect_uri=<callback>`
  - SSO route detection (`/sso/<appId>`) already adds `app=<appId>` to unauthenticated login redirect → Irno ID shows app-specific branding

- `apps/hub-web/src/components/auth/IrnoIdLoginForm.tsx`:
  - Added `handleNeedsProfile(mobile)` function in `IrnoIdLoginFormInner` — builds `/auth/register?mobile=...&fromOtp=1&returnTo=...&app=...&from=...`
  - Added `onNeedsProfile={handleNeedsProfile}` prop to `<OtpLoginPanel>`
  - Added `app=meetino` fallback in `handleSuccess`: redirects to `/sso/meetino?redirect_uri=<callback>`

- `apps/hub-web/src/components/auth/IrnoIdRegisterForm.tsx`:
  - Added `app=meetino` fallback in `handleSuccess`: redirects to `/sso/meetino?redirect_uri=<callback>`

- `apps/hub-web/src/components/auth/LoginForm.tsx`:
  - Added `app=meetino` fallback in `handleSubmit`: redirects to `/sso/meetino?redirect_uri=<callback>`

- `apps/hub-web/src/components/auth/IrnoIdShell.tsx`:
  - Added `career: 'ایرنو Career Studio'` and `cv: 'ایرنو CV'` to `APP_NAMES`

- `apps/hub-web/src/proxy.ts` (earlier in session):
  - Added `ALLOWED_RETURN_TO_ORIGINS` allowlist (career-web origin)
  - Added `validateReturnTo()` for open-redirect prevention
  - Added Priority 1 `returnTo` redirect for authenticated users
  - Added `app=career` redirect for authenticated users
  - Added SSO route detection (adds `app=<appId>` for unauthenticated users)

- `apps/hub-web/src/app/(public)/auth/login/page.tsx`:
  - Added `returnTo` to searchParams type; register footer link preserves all params

- `apps/hub-web/src/app/(public)/auth/register/page.tsx`:
  - Added `returnTo`, `mobile`, `fromOtp` to searchParams; login footer link preserves all params

- `apps/career-web/src/components/CareerCta.tsx` (rewritten):
  - Uses `returnTo` (absolute URL, e.g. `http://localhost:3002/studio/checker`) instead of relative `from`
  - Each CTA specifies its target path so post-login redirects to the right Career feature

- `apps/career-web/src/components/PublicShell.tsx`:
  - All auth CTAs use `returnTo=<absolute_career_url>` instead of `app=career` alone

- `apps/hub-web/.env.local`:
  - Added `NEXT_PUBLIC_MEETINO_CALLBACK_URL=http://localhost:3001/auth/irno/callback`

---

**Meetino SSO flow (confirmed working):**
1. Meetino "ورود با حساب ایرنو" → `buildLoginUrl()` → `/sso/meetino?redirect_uri=...`
2. Unauthenticated → proxy → `/auth/login?from=/sso/meetino?...&app=meetino` (shows «ورود به میتینو»)
3. Login → `handleSuccess` Priority 2: `from=/sso/meetino?...` → `router.push(from)`
4. `/sso/meetino` handler → generates code → redirects to Meetino callback
5. Meetino callback → exchanges code → Meetino session → Meetino `/dashboard`

ADMIN users return to Meetino, not Hub `/dashboard`. ✅

**Career Studio CTA flow (confirmed working):**
1. CareerCta → `/auth/register?app=career&returnTo=http://localhost:3002/studio/checker`
2. Unauthenticated → Register/Login form
3. Login → `handleSuccess` Priority 1: `returnTo` validated → `window.location.href = returnTo`
4. User lands on career-web `/studio/checker` regardless of role

ADMIN users return to Career Studio, not Hub `/dashboard`. ✅

**Irno ID branding:**
- `app=career` → «ورود به ایرنو Career Studio با حساب ایرنو»
- `app=meetino` → «ورود به میتینو با حساب ایرنو»
- no app → generic «حساب ایرنو»

**Allowlist (open redirect prevention):**
- `ALLOWED_RETURN_TO_ORIGINS` in both `proxy.ts` and login/register forms
- Only `NEXT_PUBLIC_CAREER_WEB_URL` origin allowed for `returnTo`
- Meetino uses `from` (hub-internal) + `redirect_uri` (validated in Hub API) — not `returnTo`
- Invalid external `returnTo` → falls through to app/role default

**Build/typecheck (Phase 18.2):**
- ✅ hub-web TypeScript: zero errors
- ✅ career-web TypeScript: zero errors
- ✅ meetino-web: pre-existing Zod v4/v3 resolver incompatibility (unrelated to this phase; no meetino-web files changed)

**Manual verification checklist:**
1. ✅ Login as ADMIN from normal Hub login → `/dashboard` (no returnTo, no app, no from)
2. ✅ Login as ADMIN from Career "ساخت رزومه" CTA → `http://localhost:3002/studio` (returnTo wins)
3. ✅ Login as ADMIN from Career "بررسی رزومه" CTA → `http://localhost:3002/studio/checker` (returnTo wins)
4. ✅ Login as STUDENT from Career CTA → same Career target (returnTo wins over role)
5. ✅ Already-logged-in ADMIN opens Career login URL → Career target (proxy Priority 1)
6. ✅ Invalid external returnTo → rejected, falls to app/role default
7. ✅ Meetino SSO: ADMIN clicks «ورود با حساب ایرنو» → Meetino target (from path wins)
8. ✅ Register from Meetino → shows «ساخت حساب برای میتینو» → returns to Meetino via SSO
9. ✅ Meetino guest join: unaffected (separate pre-join flow, no Hub auth)

**Known limitations (Phase 18.2):**
- meetino-web Zod v4 TypeScript errors are pre-existing; fix by downgrading zod to ^3.x in meetino-web or upgrading `@hookform/resolvers`
- `NEXT_PUBLIC_MEETINO_CALLBACK_URL` must be set in hub-web production env to the actual Meetino callback URL; falls back to `http://localhost:3001/auth/irno/callback` for local dev
- Career Studio `returnTo` allowlist only allows `NEXT_PUBLIC_CAREER_WEB_URL` origin; add production Career domain when deployed

---

#### Phase 18.1 — Resume Checker Scoring Quality & Auth-Aware Public Shell ✅

**Goal:** Fix three blocking quality issues before any next phase.

**No new Prisma migration — code-only fixes.**

---

**Fix A — Achievement score misleading when no experience:**

`apps/hub-api/src/career/resume-checker/rules/achievement.rules.ts`:
- Changed `no_experience_for_achievement` severity: INFO → WARNING
- Added `no_achievable_content` CRITICAL finding when no experience AND no projects

`apps/hub-api/src/career/resume-checker/resume-checker-engine.ts`:
- Added post-compute cap on `achievementScore` based on section presence:
  - No experience + no projects → cap at 45
  - No experience + has projects → cap at 65
  - Experience present → no cap (original score)

**Fix B — PublicShell header CTAs not auth-aware:**

`apps/career-web/src/components/PublicShellServer.tsx` (new file):
- Async server component reads `irno_at` httpOnly cookie via `next/headers`
- Passes `isLoggedIn: boolean` prop to `PublicShell` client component

`apps/career-web/src/components/PublicShell.tsx`:
- Added `isLoggedIn?: boolean` prop (defaults to false)
- Auth-aware header CTAs:
  - Logged-in: "رزومه‌های من" (→`/resumes`) + "ورود به استودیو ←" (→`/studio`)
  - Guest: "ورود" (→Hub login) + "شروع رایگان" (→Hub register)
- Mobile nav + footer ecosystem section also auth-aware

`apps/career-web/src/app/(public)/layout.tsx`:
- `<PublicShell>` → `<PublicShellServer>` (reads cookie server-side)

`apps/career-web/src/app/page.tsx`:
- Made async, uses `<PublicShellServer>` instead of `<PublicShell>`

`apps/career-web/src/app/(studio)/layout.tsx`:
- Unauthenticated path uses explicit `<PublicShell isLoggedIn={false}>`

**Fix C — Readability rules strengthened:**

`apps/hub-api/src/career/resume-checker/rules/readability.rules.ts`:
- `too_long` (> 800 words): severity INFO → WARNING (penalty -2 → -8)
- Added `RD_MASSIVE_SUMMARY`: fires when SUMMARY content > 1000 chars → WARNING
- Added `RD_COLLAPSED_STRUCTURE`: fires when totalSectionCount ≤ 2 AND wordCount > 200 AND ≥3 embedded section keywords → WARNING

Helpers used: `countSections(ctx)` (section count across structured + detected), `getSectionContent(ctx, type)` (merged content from all matching sections).

**Verification results:**
- achievementScore = 45 when no experience + no projects ✅
- achievementScore = 65 when no experience but has projects ✅
- achievementScore = 100 when experience present ✅
- `RD_COLLAPSED_STRUCTURE` fires on real collapsed resume (readabilityScore drops to 85, not 100) ✅
- `too_long` fires as WARNING for > 800 words (readabilityScore 92, not 98) ✅
- Good resume: readabilityScore ≥ 80 ✅
- 28/28 original fixture assertions pass ✅
- hub-api TypeScript: zero errors ✅
- career-web TypeScript: zero errors ✅

---

#### Phase 13 — Certificates & Verifiable Credentials ✅

**Architecture principle: Credit is not Certificate. Certificate is official, exportable, and verifiable. Resume Builder is a separate future product (Phase 14+) and must be a serious product, not MVP scope.**

**Definitions (enforced from Phase 13 onward):**
- **Skill** = what the student knows (internal)
- **Credit** = internal achievement / permission / proof inside Irno (not public)
- **Certificate** = official, exportable, verifiable document issued by Irno
- **Verifiable Credential** = a certificate with a public verification code / URL
- **Resume Studio** (future) = uses certificates + skills + credits as inputs — NOT implemented here

**Migration:** `20260607200000_phase13_certificates`
```bash
cd apps/hub-api
pnpm db:migrate:dev   # applies migration
pnpm db:generate      # regenerates Prisma client
```

**New Prisma models:** `CertificateTemplate`, `StudentCertificate`

**New enums:** `CertificateTemplateType`, `CertificateLanguage`, `StudentCertificateStatus`, `StudentCertificateSourceType`

**Extended enums:**
- `TimelineEventType`: `CERTIFICATE_ISSUED`, `CERTIFICATE_REVOKED`

**Certificate number format:** `IRNO-CERT-{YEAR}-{000001}` (sequential per year, zero-padded to 6 digits)

**Verification code format:** 32-byte random hex, uppercase, unique

**hub-api new module:** `CertificatesModule` (`src/certificates/`)
- `CertificateTemplatesController` — `GET|POST|GET/:id|PATCH/:id|DELETE/:id /api/v1/certificate-templates`
  - Roles: SUPER_ADMIN/ADMIN for all
- `CertificatesController`:
  - `GET /api/v1/students/:id/certificates` — SUPER_ADMIN, ADMIN, TEACHER, MENTOR
  - `POST /api/v1/students/:id/certificates` — SUPER_ADMIN, ADMIN
  - `PATCH /api/v1/students/:id/certificates/:id/revoke` — SUPER_ADMIN, ADMIN
  - `GET /api/v1/students/:id/certificates/:id/pdf` — SUPER_ADMIN, ADMIN, TEACHER, MENTOR
  - `GET /api/v1/portal/certificates` — current user only (all roles)
  - `GET /api/v1/portal/certificates/:id/pdf` — current user only
  - `GET /api/v1/certificates/verify/:code` — @Public(), no auth required
- `CertificatesService` — full lifecycle: issue, revoke, verify, portal, duplicate prevention, timeline events
  - `generateCertificateNumber()` — sequential per year
  - `generateVerificationCode()` — 32-byte random hex
  - `issueManualCertificate()`, `revokeCertificate()`, `generateCertificateForCourseCompletion()`, `generateCertificateFromCredit()` service methods ready for automation
- `CertificateRenderService` — server-side HTML certificate renderer (browser-printable / Save as PDF)

**PDF rendering:** Browser-printable HTML with Vazirmatn font, RTL, Irno branding, student name, certificate number, verification URL. Server-side PDF (puppeteer/playwright) is a known limitation — see below.

**hub-web new admin pages:**
- `/certificate-templates` — list with type/search filters
- `/certificate-templates/new` — create form
- `/certificate-templates/[id]` — detail + inline edit + delete
- `/students/[id]` — added مدارک tab with issue form, revoke dialog, PDF + copy-link buttons

**hub-web portal page:**
- `/portal/certificates` — own certificates with status badges, PDF download, copy verification link
- Empty state: «هنوز مدرکی برای شما صادر نشده است.»

**Public verification page:**
- `/verify/certificate/[code]` — no auth required
- Shows: verified badge, student name, certificate title, number, issuedAt, status
- Revoked: «این مدرک لغو شده یا معتبر نیست.»
- proxy.ts: `/verify` added to public routes allowlist

**Sidebar:** قالب‌های مدرک added under تنظیمات پایه group

**PortalShell:** مدارک من added to student navigation

**Shared packages updated:**
- `packages/types/src/enums.ts` — 4 new enums + 2 TimelineEventType values
- `packages/types/src/certificates.ts` — all certificate DTOs
- `packages/validators/src/certificates.ts` — 4 Zod schemas
- `packages/i18n/src/fa.ts` — `fa.certificates`, `fa.certificateTemplateType`, `fa.certificateLanguage`, `fa.studentCertificateStatus`

**Security:**
- Public verify endpoint only returns safe data: display name, title, number, dates, status
- No private mobile/email/internal notes exposed publicly
- Revoked certificates clearly show invalid status
- Portal endpoints scoped to current user only (no userId param)
- Verification code: 32-byte random, not predictable

**Build/typecheck:**
- ✅ hub-api TypeScript: zero errors
- ✅ hub-web TypeScript: zero errors

**Known limitations (Phase 13):**
- Server-side PDF generation not implemented — HTML certificate is browser-printable (Ctrl+P / Save as PDF). Puppeteer/playwright can be added later; endpoint contract is already in place.
- Auto-expiry: `EXPIRED` status is computed on-read; no background job. Add a cron in Phase 10.
- `generateCertificateForCourseCompletion` / `generateCertificateFromCredit` helper methods exist in service but are not wired to automatic triggers — call explicitly from enrollment completion workflow when needed.
- Template `layoutConfig` JSON is stored but not yet applied to HTML rendering — custom layout engine is future work.
- No QR code in certificate HTML — verification URL is text only. Add a QR library in a future polish phase.
- Resume Builder is explicitly NOT implemented. Future Resume Studio will use certificates + skills + credits as inputs and must be a separate serious product.

---

#### Phase 12 — Skills & Credits ✅

**Architecture principle: Skills describe what a student knows. Credits describe what a student has earned, proven, or is permitted. Neither is a full LMS feature. Both feed the eligibility engine.**

**No full LMS, no automatic grading, no certificates PDF, no job matching, no badges marketplace.**

**Migration:** `20260607000000_phase12_skills_credits`
```bash
cd apps/hub-api
pnpm db:migrate:dev   # applies migration
pnpm db:generate      # regenerates Prisma client
```

**New Prisma models:** `Skill`, `Credit`, `StudentSkill`, `StudentCredit`

**New enums:** `SkillLevel`, `SkillStatus`, `CreditType`, `CreditStatus`, `StudentSkillLevel`, `StudentCreditStatus`

**Extended enums:**
- `TimelineEventType`: `SKILL_AWARDED`, `SKILL_UPDATED`, `CREDIT_AWARDED`, `CREDIT_REVOKED`, `CREDIT_EXPIRED`
- `EventEligibilityRuleType`: `REQUIRED_SKILL`, `REQUIRED_CREDIT` (replaces `SKILL_OR_CREDIT_PLACEHOLDER` for real checks)

**hub-api new modules:**
- `SkillsModule` — `GET|POST|GET/:id|PATCH/:id|DELETE/:id /api/v1/skills`
- `CreditsModule` — `GET|POST|GET/:id|PATCH/:id|DELETE/:id /api/v1/credits`
- `StudentSkillsModule` — `GET|POST /api/v1/students/:id/skills`, `DELETE /api/v1/students/:id/skills/:id`, `GET|POST /api/v1/students/:id/credits`, `PATCH /api/v1/students/:id/credits/:id/revoke`
- `EligibilityModule` — `EligibilityService.checkStudentEligibility(studentId, rules[])` — evaluates ACTIVE_STUDENT_ONLY, NO_OVERDUE_PAYMENTS, REQUIRED_SKILL, REQUIRED_CREDIT, SPECIFIC_COURSE, SPECIFIC_COURSE_GROUP, COMPLETED_COURSE, PUBLIC, STAFF_ONLY, MANUAL_APPROVAL_REQUIRED
- `PortalModule` extended — `GET /api/v1/portal/skills`, `GET /api/v1/portal/credits` (no evidenceNote)

**hub-web new admin pages:**
- `/skills` — catalog list with search/level/status filters
- `/skills/new` — create skill form
- `/skills/[id]` — detail + archive
- `/credits` — catalog list with type/status filters
- `/credits/new` — create credit form
- `/credits/[id]` — detail + archive
- `/students/[id]` — added مهارت‌ها and اعتبارها tabs with award + revoke actions

**hub-web new portal pages:**
- `/portal/skills` — student's own skills (no evidenceNote)
- `/portal/credits` — student's own credits with status badges (no evidenceNote)

**Shared packages updated:**
- `packages/types/src/enums.ts` — all new enums added
- `packages/types/src/skills.ts` — `SkillDto`, `CreditDto`, `StudentSkillDto`, `StudentCreditDto`, `PortalSkillDto`, `PortalCreditDto`, `EligibilityCheckResult`
- `packages/types/src/portal.ts` — `skills` and `credits` added to `PortalSection`
- `packages/validators/src/skills.ts` — `createSkillSchema`, `updateSkillSchema`, `createCreditSchema`, `updateCreditSchema`, `awardStudentSkillSchema`, `awardStudentCreditSchema`, `revokeCreditSchema`
- `packages/i18n/src/fa.ts` — `fa.skills`, `fa.skillLevel`, `fa.skillStatus`, `fa.studentSkillLevel`, `fa.credits`, `fa.creditType`, `fa.creditStatus`, `fa.studentCreditStatus`; `nav.skills`, `nav.credits`

**Permissions:**
- SUPER_ADMIN/ADMIN: full catalog management + student award/revoke
- TEACHER/MENTOR: can view catalogs and award skills/credits to students
- STUDENT/APPLICANT: portal view of own skills/credits only
- Admin APIs return 403 for STUDENT/APPLICANT (enforced by global RolesGuard)

**Bug fix (same commit):** Login redirect for staff roles (ADMIN, SUPER_ADMIN, TEACHER, MENTOR, ACCOUNTANT) was broken — all users were redirected to `/portal` instead of `/dashboard`. Root cause: `ResponseInterceptor` wraps all responses in `{ data: { ... } }`, but `LoginForm.tsx`, `IrnoIdLoginForm.tsx` (both OTP and password panels), and `IrnoIdRegisterForm.tsx` were reading `json.role` from the wrapper object instead of `json.data.role`. Fixed in all three files with `const raw = await res.json(); const json = raw.data ?? raw;` pattern.

**Build/typecheck:**
- ✅ hub-api TypeScript: zero errors
- ✅ hub-web TypeScript: zero errors

**Known limitations (Phase 12):**
- `pnpm db:generate` required after migration — new model delegates not in generated Prisma client yet; backend uses `this.db = this.prisma as any` pattern throughout
- Skill catalog dropdown in award form fetches first 100 active skills — no pagination in modal
- No auto-expiry job — `CREDIT_EXPIRED` timeline event is not written automatically; computed on-read only
- Event eligibility `REQUIRED_SKILL` / `REQUIRED_CREDIT` checks added to `EligibilityService` but events UI does not yet expose rule type selector for these two new types — deferred to next phase
- Certificate PDF generation not implemented
- No public credential verification
- No gamification or badges
- Staff-only `evidenceNote` is excluded from portal responses — not yet configurable per-record

---

#### Phase 12.1 — Master Data, Taxonomy, and Admin UX Cleanup ✅

**Architecture principle: Important classifications must be structured and trackable. Raw UUID/text inputs are forbidden in normal admin UI.**

**No Certificates, no Resume Builder, no LMS, no job matching implemented in this phase.**

**Migration:** `20260607100000_phase12_1_taxonomy`
```bash
cd apps/hub-api
pnpm db:migrate:dev   # applies migration
pnpm db:generate      # regenerates Prisma client
```

**New Prisma model: `TaxonomyTerm`** (table: `taxonomy_terms`)
- Fields: `id`, `type` (TaxonomyTermType), `title`, `slug`, `description?`, `parentId?`, `status` (TaxonomyTermStatus), `sortOrder`, `color?`, `icon?`, `metadata?`, `createdAt`, `updatedAt`, `deletedAt?`
- Unique constraint: `type + slug`
- Soft delete/archive only

**New enums:** `TaxonomyTermType` (`COURSE_CATEGORY`, `SKILL_CATEGORY`, `CREDIT_CATEGORY`, `EVENT_CATEGORY`, `RESUME_CATEGORY`, `GENERAL`), `TaxonomyTermStatus` (`ACTIVE`, `ARCHIVED`)

**Models updated with `categoryId` FK:**
- `Course`: added `categoryId` (optional FK → taxonomy_terms) + `legacyCategory` for backward compat
- `Skill`: added `categoryId` + `legacyCategory`
- `Credit`: added `categoryId` + `legacyCategory`
- `Event`: added `categoryId`

**hub-api new modules:**
- `TaxonomyModule` — `GET|POST|GET/:id|PATCH/:id|DELETE/:id /api/v1/taxonomy`
  - Roles: SUPER_ADMIN/ADMIN for write; SUPER_ADMIN/ADMIN/TEACHER/MENTOR for read
  - Slug uniqueness enforced per type
  - Soft delete with usage check (archives instead of hard-delete if in use)
- `LookupModule` — lightweight read-only search endpoints for entity selectors
  - `GET /api/v1/lookup/taxonomy?type=&search=`
  - `GET /api/v1/lookup/skills?search=`
  - `GET /api/v1/lookup/credits?search=`
  - `GET /api/v1/lookup/courses?search=`
  - `GET /api/v1/lookup/course-groups?courseId=&search=`
  - `GET /api/v1/lookup/students?search=`
  - `GET /api/v1/lookup/users?role=&search=`
  - `GET /api/v1/lookup/applicants?search=`
  - Returns `LookupOptionDto[]` (id, label, subtitle?, status?) — max 50 results
  - No sensitive fields (no passwordHash, no internal notes)

**hub-web new components:**
- `AsyncSelect` (`src/components/ui/AsyncSelect.tsx`) — searchable async combobox; debounced fetch; clear button; RTL-friendly
- `TaxonomySelect` (`src/components/ui/TaxonomySelect.tsx`) — thin wrapper around AsyncSelect for `/api/v1/lookup/taxonomy?type=<type>`

**hub-web new admin pages:**
- `/taxonomy` — taxonomy term list with type/status/search filters
- `/taxonomy/new` — create taxonomy term form (type, title, slug, description, parent, status, sortOrder, color, icon)
- `/taxonomy/[id]` — taxonomy term detail + archive

**Forms fixed — UUID/text inputs replaced:**
- `Course create/update`: category now uses `TaxonomySelect (COURSE_CATEGORY)` instead of free text
- `Skill create/update`: category now uses `TaxonomySelect (SKILL_CATEGORY)`
- `Credit create/update`: category now uses `TaxonomySelect (CREDIT_CATEGORY)`
- `Event create/update`: category now uses `TaxonomySelect (EVENT_CATEGORY)`
- `Student → assign skill`: skillId now uses `AsyncSelect (/api/v1/lookup/skills)` — shows skill title + subtitle, no raw UUID
- `Student → assign credit`: creditId now uses `AsyncSelect (/api/v1/lookup/credits)` — shows credit title + type
- `Enrollment create`: student and course now use `AsyncSelect` via lookup endpoints instead of pre-loaded plain `<select>` with full list

**Sidebar refactored — grouped collapsible navigation:**
- Before: flat list of 15+ links in two sections
- After: collapsible groups with role-based visibility:
  - **داشبورد** — standalone
  - **مدیریت آموزشی** — دوره‌ها, گروه‌ها, ثبت‌نام‌ها, مهارت‌ها, اعتبارها
  - **دانشجویان و جذب** — متقاضیان, دانشجویان
  - **مالی** — پرداخت‌ها, گزارش مالی (FINANCE_ROLES only)
  - **رویدادها و جلسات** — رویدادها (EVENT_ROLES only)
  - **ارتباطات** — اعلان‌ها, قالب‌های اعلان, تنظیمات اعلان‌ها
  - **تنظیمات پایه** — دسته‌بندی‌ها, کاربران, اپلیکیشن‌ها, یکپارچه‌سازی‌ها
  - **گزارش‌ها** — همه گزارش‌ها, پیگیری‌ها, اقساط معوق (FINANCE_ROLES only)
- Active group opens automatically on route change
- `useState<Set<string>>` tracks open groups (local UI state, no persistence)
- Role filtering: if all children hidden by role, entire group header is hidden
- No existing pages removed or routes changed

**Shared packages updated:**
- `packages/types/src/taxonomy.ts` — `TaxonomyTermDto`, `PaginatedTaxonomyTerms`, `LookupOptionDto`; enums in `enums.ts`
- `packages/validators/src/taxonomy.ts` — `createTaxonomyTermSchema`, `updateTaxonomyTermSchema`
- `packages/i18n/src/fa.ts` — `fa.taxonomy`, `fa.taxonomyTermType`, `fa.taxonomyTermStatus`, `fa.lookup`

**Architecture rules added (enforced from Phase 12.1 onward):**
- Raw UUID inputs are forbidden in normal admin UI. UUIDs may only appear in developer/debug contexts.
- Important repeated classifications must use `TaxonomyTerm`, not free-text fields.
- New entity selectors must use AsyncSelect (or TaxonomySelect) backed by lookup endpoints.
- Legacy free-text category fields (`legacyCategory`) are preserved for backward compatibility — displayed as fallback if `categoryId` is null.

**Build/typecheck:**
- ✅ hub-api TypeScript: zero errors
- ✅ hub-web TypeScript: zero errors (after rebuilding packages/i18n, packages/types, packages/validators)

**Package rebuild command (required after editing shared packages):**
```bash
cd packages/types && npx tsc
cd packages/validators && npx tsc
cd packages/i18n && npx tsc
```

**Additional work completed (Phase 12.1 continuation):**
- `categoryId` filter added to courses, skills, credits, events backend services + controllers
- `CategoryFilterWidget` client component created — wraps TaxonomySelect, auto-pushes URL params on selection
- All 4 list pages (courses, skills, credits, events) now have category filter UI in filter bar
- Credits list page gained search input (was missing entirely)
- Course edit form (`course-actions.tsx`) replaced free-text category `<input>` with TaxonomySelect (pre-seeded from existing `categoryId`/`categoryTitle`)
- `CourseDto` type extended with `categoryId: string | null` and `categoryTitle: string | null`
- `courses.service.ts` extended: `taxonomyCategory` included in all queries, `categoryId` written on create/update
- `create-course.dto.ts` + `update-course.dto.ts`: `categoryId` (UUID, optional) added; `category` text made optional
- Applicant lookup bug fixed: was searching `firstName`/`lastName` fields that don't exist; now correctly searches `fullName`

**Known limitations (Phase 12.1):**
- Skill/Credit edit forms do not exist (detail pages are read-only + archive only) — no fix needed; categories set at create time
- Taxonomy `parentId` (nested categories) is supported in DB and API but not exposed in the create form UI — deferred as not needed for MVP categories
- `color` and `icon` fields in TaxonomyTerm are stored but not visually rendered in selectors yet
- Enrollment create: CourseGroup selector remains a plain `<select>` filtered by selected courseId — intentional, depends on previously selected course
- No bulk taxonomy import/export
- No taxonomy term merge/rename tool

---

#### Phase 11 — Student & Applicant Portal ✅

**Architecture principle: Admin Hub and Student Portal are separate surfaces. Admin Hub is for staff. Student Portal is user-facing.**

**No new Prisma migration needed — Phase 11 is purely additive (new module, new frontend routes).**

**New backend: PortalModule (`apps/hub-api/src/portal/`)**

All portal endpoints at `/api/v1/portal/*`. Require authentication. Scoped to current user — never accept userId param.

- `GET /api/v1/portal/me` — merged user + profile + applicantSummary + studentSummary + availableSections
- `GET /api/v1/portal/applicant` — safe applicant CRM view (no internal notes, no staff assignment details)
- `GET /api/v1/portal/student` — student summary (studentCode, status, active enrollment count)
- `GET /api/v1/portal/enrollments` — own enrollments with course/group info + Meetino join URL if linked
- `GET /api/v1/portal/payments` — own payment summaries (totals, status, course)
- `GET /api/v1/portal/installments` — own installments with overdue computed on-read
- `GET /api/v1/portal/events` — own event registrations + Meetino join URL if ONLINE/HYBRID and approved
- `GET /api/v1/portal/meetino-links` — Meetino links from active enrollments + approved event registrations
- `PATCH /api/v1/portal/profile` — update firstName, lastName, email, city, avatarUrl (mobile blocked, role/status/studentCode blocked)

**Applicant lookup strategy:** finds applicant where `createdById = userId` OR `mobile = user.mobile` (covers both self-registered and staff-created applicants who later got an account).

**New frontend routes (`apps/hub-web/src/app/portal/`):**
- `/portal` — home page (role-aware: applicant view vs student view)
- `/portal/profile` — edit profile (client component, calls PATCH /api/v1/portal/profile)
- `/portal/applicant-status` — applicant status with progress steps visualization
- `/portal/enrollments` — own enrollment list with join-class buttons
- `/portal/payments` — own payment summaries
- `/portal/installments` — own installments table with overdue highlighting
- `/portal/events` — own event registrations with join-event buttons
- `/portal/meetino` — Meetino session links
- `/portal/notifications` — notification list (reuses existing /notifications API)

**Portal shell:** `apps/hub-web/src/components/portal/PortalShell.tsx` — simpler shell than admin AppShell. Different nav based on role (student vs applicant).

**Role-based post-login redirect (updated in login forms and root page):**
- `SUPER_ADMIN / ADMIN / ACCOUNTANT / TEACHER / MENTOR` → `/dashboard`
- `APPLICANT / STUDENT / GUEST / LEAD` → `/portal`
- Implemented in: `LoginForm.tsx`, `IrnoIdLoginForm.tsx`, `IrnoIdRegisterForm.tsx`, `app/page.tsx`
- New self-registered users (APPLICANT) always go to `/portal` after registration

**Portal layout (`apps/hub-web/src/app/portal/layout.tsx`):**
- Calls `GET /api/v1/portal/me` (server-side)
- Unauthenticated → redirect to `/auth/login?from=/portal`
- Renders `PortalShell` with full portal identity

**Shared packages updated:**
- `packages/types/src/portal.ts` — `PortalMeDto`, `PortalApplicantSummaryDto`, `PortalStudentSummaryDto`, `PortalEnrollmentDto`, `PortalPaymentDto`, `PortalInstallmentDto`, `PortalEventItemDto`, `PortalMeetinoLinkDto`, `PortalSection`, `UpdatePortalProfileDto`
- `packages/validators/src/portal.ts` — `updatePortalProfileSchema`
- `packages/i18n/src/fa.ts` — `fa.portal` section with all portal Persian labels

**Files added:**
- `apps/hub-api/src/portal/portal.module.ts`
- `apps/hub-api/src/portal/portal.controller.ts`
- `apps/hub-api/src/portal/portal.service.ts`
- `apps/hub-api/src/portal/dto/update-portal-profile.dto.ts`
- `apps/hub-web/src/app/portal/layout.tsx`
- `apps/hub-web/src/app/portal/page.tsx`
- `apps/hub-web/src/app/portal/profile/page.tsx`
- `apps/hub-web/src/app/portal/applicant-status/page.tsx`
- `apps/hub-web/src/app/portal/enrollments/page.tsx`
- `apps/hub-web/src/app/portal/payments/page.tsx`
- `apps/hub-web/src/app/portal/installments/page.tsx`
- `apps/hub-web/src/app/portal/events/page.tsx`
- `apps/hub-web/src/app/portal/meetino/page.tsx`
- `apps/hub-web/src/app/portal/notifications/page.tsx`
- `apps/hub-web/src/components/portal/PortalShell.tsx`
- `packages/types/src/portal.ts`
- `packages/validators/src/portal.ts`

**Files changed:**
- `apps/hub-api/src/app.module.ts` — registered PortalModule
- `apps/hub-web/src/app/page.tsx` — role-aware root redirect
- `apps/hub-web/src/lib/api.ts` — portal API helpers added
- `apps/hub-web/src/proxy.ts` — comment clarifying role-based redirect is in login forms, not proxy
- `apps/hub-web/src/components/auth/LoginForm.tsx` — role-based post-login redirect
- `apps/hub-web/src/components/auth/IrnoIdLoginForm.tsx` — role-based post-login redirect
- `apps/hub-web/src/components/auth/IrnoIdRegisterForm.tsx` — new registrations → /portal
- `packages/types/src/index.ts` — export portal types
- `packages/validators/src/index.ts` — export portal schema
- `packages/i18n/src/fa.ts` — fa.portal section added

**No new env vars needed.**

**No new database migration needed.**

**Commands to run:**
```bash
# Build shared packages (must rebuild after editing src/)
cd packages/types && node_modules/.bin/tsc
cd packages/validators && node_modules/.bin/tsc
cd packages/i18n && node_modules/.bin/tsc

# Start dev (from root)
pnpm dev

# TypeScript check
cd apps/hub-api && npx tsc --noEmit    # zero errors
cd apps/hub-web && npx tsc --noEmit    # zero errors
```

**Manual verification steps:**
1. Register a new account → redirected to `/portal` (not `/dashboard`)
2. Login as APPLICANT → redirected to `/portal`
3. Login as STUDENT → redirected to `/portal`
4. Login as ADMIN → redirected to `/dashboard`
5. Applicant can see `/portal/applicant-status` with status + next-steps message
6. Student can see `/portal/enrollments` with own courses (not other students)
7. Student can see `/portal/payments` with own payment totals
8. Student can see `/portal/installments` with overdue highlighting
9. Student can see `/portal/events` with event registrations and join links
10. Student can see `/portal/meetino` with allowed Meetino links
11. Any user can see `/portal/notifications` with own notifications
12. Profile edit at `/portal/profile` saves firstName/lastName/city/email/avatarUrl
13. APPLICANT cannot access `/api/v1/applicants` (admin API — returns 403)
14. STUDENT cannot access `/api/v1/students` (admin API — returns 403)
15. Portal pages are Persian RTL
16. Light/dark mode toggles correctly in portal shell

**Known limitations (intentional for Phase 11 MVP):**
- No public event self-registration from portal — only viewing existing registrations
- No online payment gateway — payment recording still requires contacting staff
- No installment PAID action — still requires staff to record transaction
- No certificate/skill display — deferred to Skills & Credits phase
- No LMS lessons/videos — deferred to Irno Learn phase
- No chat — deferred to Irno Chat phase
- Profile photo upload — only URL input; file upload deferred (requires storage service)
- Mobile number change — blocked intentionally; requires SMS verification (future)
- Staff users (ADMIN etc.) can visit /portal — they see an abbreviated view; this is intentional (not a bug)
- Meetino links for staff accessing portal are limited; staff should use admin hub for session management
- The `/portal/notifications` page is read-only; mark-as-read requires client-side interaction (deferred to client component upgrade)

**Terminology established:**
- Admin Hub = `/dashboard` and all `(app)` routes — for staff
- Student Portal = `/portal` and all `portal/` routes — for applicants, students, public
- Irno ID = central identity (`/auth/` routes) — for all users
- Portal does not break or replace Admin Hub; they coexist in the same Next.js app

**Future phases (not yet started):**
- Skills & Credits (Phase 12) — student achievements and certificates
- Irno Learn / LMS (Phase 14) — lesson content, quizzes, video
- Irno Chat (Phase 14) — messaging
- Advanced Meetino attendance sync (Phase 15)
- Mobile app (future)

---

#### Phase 11.1 — OTP-Based Irno ID Login & Student Account Activation ✅

**Architecture principle: OTP is the primary modern login flow. Password is the legacy fallback. Both coexist.**

**No existing functionality removed. Password login still works. OTP adds mobile-first identity.**

---

**New Prisma model: `OtpCode` (table: `otp_codes`)**

Fields: `id`, `mobile`, `userId` (optional FK), `codeHash` (bcrypt hash — raw code never stored), `purpose` (OtpPurpose enum), `expiresAt`, `consumedAt` (one-time use), `attempts`, `maxAttempts`, `createdAt`.

**New enum: `OtpPurpose`** — `LOGIN`, `REGISTER`, `ACTIVATE_ACCOUNT`, `PASSWORD_RESET`

**New field on User: `activatedAt DateTime?`** — set when a user first authenticates via OTP (or was always active). Null means not yet activated.

**Migration:** `20260606000000_phase11_1_otp`

```bash
cd apps/hub-api
pnpm db:migrate:dev   # applies migration (OtpCode table, activatedAt on users, OtpPurpose enum)
pnpm db:generate      # regenerates Prisma client
```

---

**New backend: `OtpService` (`apps/hub-api/src/auth/otp.service.ts`)**

- `createOtp(mobile, purpose, userId?)` — generates random 6-digit code, bcrypt-hashes it, stores in DB. Enforces resend cooldown (OTP_RESEND_COOLDOWN_SECONDS). In mock mode, logs code to console.
- `verifyOtp(mobile, code)` — finds latest unconsumed OTP, checks expiry, checks attempt count, verifies bcrypt hash, marks consumed. Increments attempts on failure; invalidates after maxAttempts.
- `sendOtpSms(mobile, code)` — dispatches to configured OTP provider (mock by default).
- `normalizeMobile(mobile)` — normalises `+989...` / `989...` → `09...` for consistent storage.

**Security rules enforced:**
- Raw OTP never stored — bcrypt hash only.
- OTP expires in `OTP_TTL_SECONDS` (default 120s).
- One-time use — `consumedAt` set after successful verification.
- Attempt limit — `OTP_MAX_ATTEMPTS` (default 5). After limit: OTP invalidated.
- Resend cooldown — `OTP_RESEND_COOLDOWN_SECONDS` (default 60s) between requests per mobile.
- No enumeration — response never reveals whether mobile is registered.
- Rate-limit: HTTP 429 + cooldownSeconds returned to client.

---

**New auth endpoints:**

```
POST /api/v1/auth/otp/request   [Public]
  Body: { mobile, purpose? }
  → Creates OTP, sends via SMS provider. Returns { message, cooldownSeconds }.
  → HTTP 429 if resend cooldown active (body includes cooldownSeconds).

POST /api/v1/auth/otp/verify    [Public]
  Body: { mobile, code, firstName?, lastName?, email? }
  → If existing user: activates PENDING account, sets activatedAt, issues auth cookies.
  → If new user + profile provided: creates User (APPLICANT) + Profile + Applicant CRM record.
  → If new user + no profile: returns { needsProfile: true, mobile } (HTTP 200, no cookies).
  → Never creates Student, Enrollment, or Payment.
```

**Updated: `POST /api/v1/auth/login`**

- If user exists but has no `passwordHash`: HTTP 401 with `{ code: 'NO_PASSWORD', message: 'برای ورود، از کد یک‌بارمصرف استفاده کنید.' }`
- Password login still works for users with a password.

---

**Admin-created student account behaviour (OTP activation):**

When admin creates a Student without a password, the User record has `status=PENDING` and `activatedAt=null`. When the student logs in via OTP:
1. OTP is verified successfully.
2. `status` is updated to `ACTIVE`, `activatedAt` is set.
3. Auth cookies are issued — student is now logged in.
No activation link required. No random password. OTP is the canonical activation method.

---

**Frontend changes:**

`/auth/login` (`IrnoIdLoginForm.tsx`):
- Two-tab UI: **ورود با کد یک‌بارمصرف** (primary, default) and **ورود با رمز عبور** (secondary).
- OTP tab: Step 1 = mobile input + send button. Step 2 = 6-digit code + verify. Cooldown timer on resend. Back-to-edit button.
- Password tab: unchanged mobile + password form. Shows `fa.irnoId.noPasswordUseOtp` error when account has no password.

`/auth/register` (`IrnoIdRegisterForm.tsx`) — OTP-first:
- Step 1: Mobile input → request OTP.
- Step 2: 6-digit code → verify.
  - If user exists → logged in (redirected).
  - If new user → Step 3.
- Step 3: firstName, lastName, email (optional) → request fresh OTP → verify with profile data → account created.
- `?mobile=...&fromOtp=1` query params: used when login page redirects here for profile completion (needsProfile=true).
- Creates APPLICANT account, NOT Student, Enrollment, or Payment.

---

**SMS provider architecture (updated in Phase 11.2):**

- `OtpService` does NOT handle SMS delivery. It only creates/verifies OTP codes.
- `AuthService` calls `SmsService` (from `NotificationsModule`) after creating an OTP — no direct provider call.
- `AuthModule` imports `NotificationsModule` to get `SmsService`.
- `NOTIFICATION_SMS_PROVIDER=mock` env var (canonical). Default logs SMS to console via `MockSmsProvider`.
- No secrets in frontend. No raw codes in DB or logs (only bcrypt hash).
- In mock mode, `devCode` is included in the API response and shown in the frontend dev banner.

---

**New env vars (`apps/hub-api/.env`):**

```
OTP_TTL_SECONDS=120              # OTP validity window in seconds
OTP_MAX_ATTEMPTS=5               # Wrong-code attempts before invalidation
OTP_RESEND_COOLDOWN_SECONDS=60   # Minimum seconds between resend requests
OTP_PROVIDER=mock                # 'mock' = log to console; swap for real provider
```

---

**Files added (Phase 11.1):**
- `apps/hub-api/prisma/migrations/20260606000000_phase11_1_otp/migration.sql`
- `apps/hub-api/src/auth/otp.service.ts`
- `apps/hub-api/src/auth/dto/otp-request.dto.ts`
- `apps/hub-api/src/auth/dto/otp-verify.dto.ts`
- `packages/types/src/otp.ts`
- `packages/validators/src/otp.ts`

**Files changed (Phase 11.1):**
- `apps/hub-api/prisma/schema.prisma` — added `OtpPurpose` enum, `OtpCode` model, `activatedAt` on User
- `apps/hub-api/src/auth/auth.service.ts` — added `requestOtp()`, `verifyOtp()`; updated `login()` for passwordless users
- `apps/hub-api/src/auth/auth.controller.ts` — added `POST otp/request` and `POST otp/verify`
- `apps/hub-api/src/auth/auth.module.ts` — registered `OtpService`
- `apps/hub-api/.env` — added OTP env vars
- `packages/types/src/enums.ts` — added `OtpPurpose` enum
- `packages/types/src/index.ts` — export otp
- `packages/validators/src/env.ts` — added OTP env var schema
- `packages/validators/src/index.ts` — export otp validators
- `packages/i18n/src/fa.ts` — added `fa.irnoId.otp.*` section + `noPasswordUseOtp`
- `apps/hub-web/src/components/auth/IrnoIdLoginForm.tsx` — OTP primary tab + password secondary tab
- `apps/hub-web/src/components/auth/IrnoIdRegisterForm.tsx` — OTP-first registration flow

---

**Build/typecheck commands:**

```bash
# Rebuild shared packages (required after editing src/)
cd packages/types && npx tsc
cd packages/validators && npx tsc
cd packages/i18n && npx tsc

# TypeScript check (must be zero errors)
cd apps/hub-api && npx tsc --noEmit   # ✅ zero errors
cd apps/hub-web && npx tsc --noEmit   # ✅ zero errors
```

---

**Manual verification checklist:**

1. Request OTP for existing user → OTP logged to console (mock mode)
2. Verify OTP → user logged in, auth cookies set
3. Admin-created student with no password → OTP login works → status becomes ACTIVE, activatedAt set
4. Non-existing mobile → OTP verify without profile → `{ needsProfile: true }` returned
5. Non-existing mobile → OTP verify with firstName+lastName → APPLICANT account created, logged in
6. Try same OTP code twice → second attempt returns INVALID_CODE (already consumed)
7. Wait for OTP to expire (OTP_TTL_SECONDS) → verify returns EXPIRED_CODE
8. Wrong code 5 times → TOO_MANY_ATTEMPTS, OTP invalidated
9. Resend before cooldown → HTTP 429 with cooldownSeconds in body
10. Password login still works for users with a password
11. Password login with passwordless account → `{ code: 'NO_PASSWORD' }` error
12. Login page shows OTP tab by default, password tab as secondary
13. Register page: mobile → OTP → code → profile → account created
14. Meetino SSO works after OTP login (SSO uses existing auth session)
15. Guest join unchanged — no Hub account created
16. `GET /api/v1/portal/me` returns correct data after OTP login
17. No Student / Enrollment / Payment created by OTP registration

---

**Known limitations (Phase 11.1):**
- Real SMS provider not integrated — `NOTIFICATION_SMS_PROVIDER=mock` logs code to console only. To add Kavenegar or other provider: implement `ISmsProvider` in a new file, add a case in `SmsService` constructor.
- No IP-based rate limiting — cooldown is per-mobile only. Add IP throttling via NestJS `ThrottlerModule` in a future hardening phase.
- OTP records accumulate in DB — no cleanup job. Add a cron to purge consumed/expired OTPs periodically.
- `activatedAt` field requires `db:generate` after migration — uses `as any` casts in service until Prisma client is regenerated.
- Register flow Step 3→ requests a fresh OTP before creating account — user receives a second SMS. This is the secure behaviour (no OTP bypass), but UX could be improved with a signed token flow in future.
- Forgot password via OTP not yet connected to password-reset flow — `/auth/forgot-password` remains a placeholder.

---

#### Phase 11.2 — Notification Provider Independence & OTP Delivery Cleanup ✅

**Architecture principle: No module sends SMS/push/email/telegram directly. All delivery routes through NotificationsModule.**

**No new Prisma migration needed — Phase 11.2 is a refactor only.**

**Key architectural changes:**

**OTP delivery flow (before → after):**
- Before: `OtpService` had its own inline SMS logic (`sendOtpSms()`), checked `OTP_PROVIDER` env, was siloed from `NotificationsModule`.
- After: `OtpService` is a pure OTP lifecycle service (create + verify only). `AuthService` calls `SmsService` from `NotificationsModule`. `AuthModule` imports `NotificationsModule`.

**SmsService improvements:**
- Now injects `ConfigService` and reads `NOTIFICATION_SMS_PROVIDER` env var.
- Logs active provider name at startup.
- `providerName` getter exposed so callers can detect mock/dev mode without env reads.

**New provider interfaces (stubs for future providers):**
- `src/notifications/providers/push-provider.interface.ts` — `IPushProvider`
- `src/notifications/providers/email-provider.interface.ts` — `IEmailProvider`
- `src/notifications/providers/telegram-provider.interface.ts` — `ITelegramProvider`
- `ISmsProvider` updated: added `enabled` field for consistency

**Firebase status:** Zero Firebase references in codebase. Firebase is NOT required, NOT imported, and NOT used. If Firebase/FCM is added in future, it must implement `IPushProvider` and only activate when `NOTIFICATION_PUSH_PROVIDER=fcm`.

**Files added (Phase 11.2):**
- `apps/hub-api/src/notifications/providers/push-provider.interface.ts`
- `apps/hub-api/src/notifications/providers/email-provider.interface.ts`
- `apps/hub-api/src/notifications/providers/telegram-provider.interface.ts`

**Files changed (Phase 11.2):**
- `apps/hub-api/src/notifications/sms/sms-provider.interface.ts` — added `enabled` field + doc comment
- `apps/hub-api/src/notifications/sms/mock-sms.provider.ts` — added `enabled`, `Logger`, doc comment
- `apps/hub-api/src/notifications/sms/sms.service.ts` — inject `ConfigService`, read `NOTIFICATION_SMS_PROVIDER`, log startup, expose `providerName`/`enabled` getters
- `apps/hub-api/src/notifications/notifications.module.ts` — export `SmsService`, updated module doc
- `apps/hub-api/src/auth/otp.service.ts` — removed `sendOtpSms()`, removed inline `OTP_PROVIDER` check, pure OTP lifecycle only
- `apps/hub-api/src/auth/auth.service.ts` — inject `SmsService`, call `smsService.send()` for OTP delivery, `devCode` check via `smsService.providerName`
- `apps/hub-api/src/auth/auth.module.ts` — import `NotificationsModule`
- `packages/validators/src/env.ts` — added `NOTIFICATION_SMS_PROVIDER`, `NOTIFICATION_PUSH_PROVIDER`, `NOTIFICATION_EMAIL_PROVIDER`, `NOTIFICATION_TELEGRAM_PROVIDER`, optional `FIREBASE_*` vars
- `apps/hub-api/.env` — added all `NOTIFICATION_*` vars with comments; `FIREBASE_*` vars commented out as optional

**New env vars (Phase 11.2):**
```
NOTIFICATION_SMS_PROVIDER=mock        # 'mock' = log to console (default). Set to provider name for real SMS.
NOTIFICATION_PUSH_PROVIDER=none       # 'none' = push disabled. Future: 'fcm' (optional, requires FIREBASE_* vars).
NOTIFICATION_EMAIL_PROVIDER=none      # 'none' = email disabled. Future: 'smtp' etc.
NOTIFICATION_TELEGRAM_PROVIDER=none   # 'none' = telegram disabled. Future: 'bot' etc.
# FIREBASE_PROJECT_ID=               # Optional — only if NOTIFICATION_PUSH_PROVIDER=fcm
# FIREBASE_CLIENT_EMAIL=             # Optional — only if NOTIFICATION_PUSH_PROVIDER=fcm
# FIREBASE_PRIVATE_KEY=              # Optional — only if NOTIFICATION_PUSH_PROVIDER=fcm
```

**Verification results:**
- ✅ `hub-api` TypeScript: zero errors
- ✅ `hub-web` TypeScript: zero errors
- ✅ Firebase: zero references anywhere in codebase
- ✅ OTP delivery: goes through `SmsService` → `MockSmsProvider` → console log
- ✅ No direct SMS provider call in `AuthService` or `OtpService`
- ✅ `NOTIFICATION_SMS_PROVIDER=mock` → app starts, OTP works
- ✅ Notifications (in-app) still work
- ✅ OTP login still works
- ✅ Meetino SSO still works

#### Phase 11.3 — Irno ID Password Management ✅

**Architecture principle: Irno ID is OTP-first. Password login is an optional fallback. Users can define a password anytime from their portal profile. Admin-created students log in via OTP and can set a password afterward. No random passwords are ever generated.**

**No new Prisma migration needed — Phase 11.3 is purely additive (new endpoint + DTO + UI).**

**New endpoint:**
```
PATCH /api/v1/auth/password   [Authenticated]
  Body: { currentPassword?, newPassword, confirmPassword }
  — If user has no password: set without currentPassword
  — If user has password: currentPassword required and verified
  — newPassword and confirmPassword must match
  — Strength: min 8 chars, at least one letter, at least one digit
  — Hash: bcrypt cost 12
  — Invalidates all refresh sessions after change
  — Returns: { message: 'رمز عبور با موفقیت تنظیم شد.' | 'رمز عبور با موفقیت تغییر کرد.' }

POST /api/v1/auth/change-password   [Deprecated alias — kept for backward compat]
```

**`hasPassword` safe boolean:**
- Added to `UserWithProfileDto` and `PortalMeDto`
- `hasPassword = Boolean(user.passwordHash)`
- `passwordHash` is never returned anywhere

**Portal profile UI (`/portal/profile`):**
- Account info card: shows password status (تعریف شده / بدون رمز عبور)
- Password section:
  - `hasPassword=false`: title «تعریف رمز عبور», no currentPassword field, help text, button «ثبت رمز عبور»
  - `hasPassword=true`: title «تغییر رمز عبور», currentPassword required, button «تغییر رمز عبور»
  - Persian success/error messages, loading state, RTL

**Files added (Phase 11.3):**
- `apps/hub-api/src/auth/dto/set-password.dto.ts`

**Files changed (Phase 11.3):**
- `apps/hub-api/src/auth/auth.controller.ts` — added `PATCH auth/password` route; kept `POST change-password` as deprecated alias
- `apps/hub-api/src/auth/auth.service.ts` — added `setPassword()` method; updated `toUserWithProfileDto` to include `hasPassword`
- `apps/hub-api/src/users/users.service.ts` — updated `toDto` to include `hasPassword`
- `apps/hub-api/src/portal/portal.service.ts` — added `hasPassword` to `/portal/me` response
- `packages/types/src/user.ts` — added `hasPassword: boolean` to `UserDto`
- `packages/types/src/portal.ts` — added `hasPassword: boolean` to `PortalMeDto`
- `apps/hub-web/src/app/portal/profile/page.tsx` — added `PasswordSection` component with conditional UI

**Build/typecheck (Phase 11.3):**
- ✅ `hub-api` TypeScript: zero errors
- ✅ `hub-web` TypeScript: zero errors

**Manual verification checklist:**
1. OTP-only user logs in → `/portal/profile` shows «بدون رمز عبور — ورود با کد یک‌بارمصرف»
2. Password section title: «تعریف رمز عبور», no currentPassword field shown
3. User submits newPassword + confirmPassword → `PATCH /auth/password` → 200 OK, «رمز عبور با موفقیت تنظیم شد.»
4. `hasPassword` becomes true in subsequent `/portal/me` response
5. User can now login with password via password tab
6. `/portal/profile` now shows «تغییر رمز عبور» section with currentPassword field
7. Wrong currentPassword → Persian error: «رمز عبور فعلی صحیح نیست.»
8. Correct currentPassword → «رمز عبور با موفقیت تغییر کرد.»
9. mismatched newPassword/confirmPassword → «رمز عبور جدید و تکرار آن یکسان نیستند.»
10. `passwordHash` never appears in any API response
11. OTP login still works after setting password
12. Meetino SSO unaffected

**Known limitations (Phase 11.3):**
- Password strength is basic (min 8 + letter + digit) — no complexity score or zxcvbn
- After PATCH /auth/password, cookies are cleared (session ends) — user must log in again. This is intentional for security but could be improved to re-issue tokens automatically.
- `POST /auth/change-password` is kept as deprecated alias — remove in Phase 10 cleanup.
- Forgot password flow is not yet connected — `/auth/forgot-password` remains placeholder.

---

**Known limitations (Phase 11.2):**
- `OTP_PROVIDER` env var from Phase 11.1 is now unused — `NOTIFICATION_SMS_PROVIDER` is the canonical var. Old `.env` files with `OTP_PROVIDER` still work (Zod schema no longer requires it, but extra vars are ignored by NestJS ConfigService).
- Real Iranian SMS provider (Kavenegar, FarazSMS, Melipayamak) not implemented — add by implementing `ISmsProvider` and setting `NOTIFICATION_SMS_PROVIDER=<name>`.
- `NotificationsService.notifyUser()` SMS channel is still a no-op stub — wiring mobile lookup + full SMS delivery for in-app notifications is future work.
- Push/Email/Telegram provider interfaces are stubs only — no implementations yet.

---

### Known Issues / Technical Debt

* `apps/hub-web/next.config.ts`: warning about unrecognized key `resolveExtensionAlias` at `turbopack`. Non-blocking — app starts fine. Fix when convenient.

---

### How to Run Locally

```bash
# 1. Start infrastructure
cd infra && docker compose up -d

# 2. Install dependencies (from root)
pnpm install

# 3. Generate Prisma client
cd apps/hub-api && pnpm db:generate

# 4. Run migrations
cd apps/hub-api && pnpm db:migrate:dev

# 5. Seed database
cd apps/hub-api && pnpm db:seed

# 6. Start dev servers (from root)
pnpm dev
# hub-api → http://localhost:3001
# hub-web → http://localhost:3000
```

---

#### Phase 22 — Security Hardening, Abuse Control, and Production Safety ✅

**Goal:** Harden all Irno platform apps for production. No new product features. No deployment yet — this phase prepares the security baseline that Phase 10 (Production Deployment) requires.

**No new Prisma migration needed — Phase 22 is code-only.**

---

**A: Security Headers — All Three Next.js Apps**

`apps/hub-web/next.config.ts`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` in production (1 year, includeSubDomains)
- `Content-Security-Policy-Report-Only` with `frame-ancestors 'none'`, Google Fonts allowlist

`apps/career-web/next.config.ts`:
- Same as hub-web but `X-Frame-Options: SAMEORIGIN` (in-editor iframe preview required)
- `frame-src 'self' blob:`, `img-src 'self' data: https:`, `frame-ancestors 'self'`

`apps/meetino-web/next.config.mjs`:
- `Permissions-Policy: camera=(self), microphone=(self)` (video meetings require these)
- `connect-src 'self' wss: ws: https:` (LiveKit WebRTC)
- `media-src 'self' blob:` (recording)

`apps/hub-api/src/main.ts` — Helmet: production HSTS, `contentSecurityPolicy: false` (API-only)

---

**B: XSS Prevention — HTML Export & Public Surfaces**

`apps/hub-api/src/career/career-export.service.ts`:
- `escapeHtml(str)` — applies to all user-supplied text content in HTML snapshots
- `safeUrl(url)` — strips `javascript:`, `data:`, `vbscript:` from href attributes; only `http:`, `https:`, `mailto:`, relative paths pass
- `safeCssColor(color)` — validates user-supplied `accentColor` against `#RGB`/`#RRGGBB`/named-color allowlist; prevents CSS injection in `<style>` blocks; falls back to `#2563eb`
- Applied to: `demoUrl`, `repoUrl`, `verificationUrl`, all link section `url` fields, `accentColor` in style blocks

---

**C: CSRF / Cookie / CORS Hardening**

`apps/hub-api/src/main.ts`:
- `API_CORS_ORIGINS` env var (comma-separated allowlist)
- `buildCorsOriginValidator()` — origin callback rejects any origin not in the allowlist; never uses `*` with credentials
- `app.useBodyParser('json', { limit: '1mb' })` — JSON body size cap
- `app.useBodyParser('urlencoded', { extended: true, limit: '1mb' })`
- Auth cookies set with `httpOnly: true`, `sameSite: 'lax'` (existing), `secure: true` in production

New env var:
```
API_CORS_ORIGINS=http://localhost:3000,http://localhost:3002,http://localhost:3001
```

---

**D: Auth / Authorization Ownership Audit**

Verified (no changes needed — architecture already correct):
- All career endpoints use `user.id` from JWT — no `userId` from request body accepted
- `resolveResumeOwnership()` checks `careerProfile.userId === user.id`
- Portal endpoints (`/api/v1/portal/*`) never accept a `userId` param — always scoped to authenticated user
- SSO exchange: `clientSecret` validated server-side with constant-time comparison
- Public profile: only `PUBLIC_LINK` resumes exposed; private/disabled return 404 with no data leaked

---

**E: Rate Limiting — Redis-Backed Fixed-Window**

New files:
- `apps/hub-api/src/security/security.module.ts` — `@Global()` module; registers `RateLimitGuard` as `APP_GUARD`
- `apps/hub-api/src/security/rate-limit.decorator.ts` — `@RateLimit({ key, max, windowS, keyBy })` decorator
- `apps/hub-api/src/security/rate-limit.guard.ts` — fixed-window counter via `RedisService.incrWithTtl()` (Lua atomic INCR+TTL); fail-open on Redis error; Persian 429 message

`apps/hub-api/src/redis/redis.service.ts`:
- Added `incrWithTtl(key, ttlSeconds)` — Lua atomic script (race-condition-free)
- Added `ttl(key)` method

Limits applied:

| Endpoint | Key | Max | Window | By |
|---|---|---|---|---|
| POST /auth/login | auth-login | 10 | 15 min | ip |
| POST /auth/register | auth-register | 5 | 1 hour | ip |
| PATCH /auth/password | auth-password | 5 | 1 hour | user |
| POST /auth/otp/request | otp-request | 3 | 2 min | ip |
| POST /auth/otp/verify | otp-verify | 10 | 10 min | ip |
| POST /sso/code | sso-code | 20 | 10 min | user |
| POST /sso/exchange | sso-exchange | 30 | 1 min | ip |
| POST /career/resumes/:id/check | checker-irno | 20 | 1 hour | user |
| POST /career/checker/text | checker-text | 10 | 1 hour | user |
| POST /career/checker/upload | checker-upload | 10 | 1 hour | user |
| POST /career/resumes/:id/export | export-trigger | 20 | 1 hour | user |
| POST /career/job-match | job-match | 15 | 1 hour | user |
| POST /career/job-match/upload | job-match-upload | 10 | 1 hour | user |
| GET /career/public/:slug | public-profile | 60 | 1 min | ip |
| GET /career/public/:slug/resume/download | public-pdf-download | 20 | 10 min | ip |
| GET /career/public/:slug/projects/:projectSlug | public-project | 60 | 1 min | ip |

---

**F+G: Request Body / Upload Limits & PDF Safety**

- JSON body: 1 MB cap (NestJS body parser)
- File uploads: enforced per endpoint by `MulterModule` limits:
  - Checker/Job-Match: 5 MB max, PDF or TXT only (type validated in `fileFilter`)
  - PDF export storage: path traversal protection via `path.resolve()` comparison; owner-only via `resolveResumeOwnership()`
- `client_max_body_size 10m` in Nginx as hard outer cap

---

**H: Meetino Room Limits & Real-Time Abuse Control**

`apps/meetino-api/src/modules/meetings/meetings.service.ts`:
- `assertJoinable()` — enforces `MEETING_MAX_PARTICIPANTS` (default 50) via DB count of active participants (`leftAt IS NULL AND wasKicked = false`)
- `ConflictException` with Persian message when room is full

`apps/meetino-api/src/modules/realtime/meeting.gateway.ts`:
- Per-socket in-memory fixed-window rate limiter
- `socketEventCounts: Map<socketId, Map<category, {count, windowStart}>>`
- Limits: whiteboard 60/s, chat 10/5s, media 20/s, join 3/10s
- Over-limit `WHITEBOARD_OP`: silently dropped; over-limit `JOIN`: emits `FORBIDDEN` error
- `clearSocketRateLimits(socketId)` called on disconnect to free memory

New env var:
```
MEETING_MAX_PARTICIPANTS=50   # Hard room capacity cap
```

---

**I+J: Security Logging & Error Handling**

New file: `apps/hub-api/src/security/security-log.service.ts`
- Structured JSON security events logged via `Logger('Security')`
- **NEVER logs**: passwords, OTP codes, JWT tokens, refresh tokens, secrets, full file contents, sensitive personal data
- Events: `AUTH_FAILURE`, `RATE_LIMIT`, `UPLOAD_REJECTED`, `PDF_QUEUE_FULL/TIMEOUT/ERROR`, `SSO_ABUSE`, `UNAUTHORIZED_ACCESS`, `CORS_REJECTED`, `MEETING_ROOM_FULL`, `SCREEN_SHARE_CONFLICT`
- Strips query params from `redirectUri` before logging
- Truncates filenames to last 10 chars

`RateLimitGuard` — calls `securityLog.rateLimitHit()` on every 429 event.

`apps/hub-api/src/meetino-integration/meetino-sso.service.ts` — `SecurityLogService` injected:
- `ssoAbuse({ ip, reason: 'invalid_client_secret' })` on bad `clientSecret` in `exchangeCode()`
- `ssoAbuse({ ip, reason: 'sso_code_not_found_or_expired' })` on stale/missing code
- `ssoAbuse({ ip, reason: 'redirect_uri_not_allowlisted' | ... })` on bad redirect URI
- Controller methods extract IP from `X-Forwarded-For` and pass to service

`HttpExceptionFilter` — confirmed: no stack traces in production response body; stack only emitted to `Logger.error` for unhandled exceptions.

---

**K: Nginx Security Configuration (Prepared, Not Deployed)**

New files:
- `infra/nginx/nginx.conf` — production Nginx config
- `infra/nginx/proxy_params.conf` — shared proxy header params

Nginx config includes:
- `server_tokens off` — hides Nginx version
- TLS 1.2/1.3 only, strong cipher suite
- HSTS in server block headers
- Rate limit zones: `auth` (10 req/min), `otp` (3 req/min), `api` (200 req/min), `upload` (5 req/min), `static` (500 req/min)
- Per-location `limit_req` with burst allowances
- WebSocket proxy for Meetino Socket.IO (3600s read timeout)
- `client_max_body_size 10m` outer cap
- ACME HTTP-01 challenge path for Let's Encrypt renewal
- 301 HTTP→HTTPS redirect server block
- Security headers at Nginx level (defence-in-depth vs Next.js headers)
- Custom error page routing (no stack trace exposure)
- `Content-Disposition: attachment` for PDF download endpoint

---

**TypeScript Results (Phase 22):**

| App | Result |
|---|---|
| hub-api | ✅ zero errors |
| hub-web | ✅ zero errors |
| career-web | ✅ zero errors |
| meetino-api | ✅ zero errors |
| meetino-web | ⚠️ 4 pre-existing errors (Zod v4/v3 `@hookform/resolvers` incompatibility — documented in Phase 18.2, not introduced by Phase 22) |

---

**New env vars (Phase 22):**
```
# hub-api
API_CORS_ORIGINS=http://localhost:3000,http://localhost:3002,http://localhost:3001

# meetino-api
MEETING_MAX_PARTICIPANTS=50
```

**No new Prisma migration. No new npm packages. No product features.**

**Known limitations (Phase 22):**
- Rate limiter is in-process per hub-api instance — horizontal scaling requires Redis distributed semaphore or shared counter (planned for Phase 10)
- Nginx config uses placeholder domain names (`hub.irno.academy`, etc.) — update with real domains before deploying
- TLS certificates referenced in Nginx config do not exist yet — generate with Certbot in Phase 10
- `SecurityLogService` events are written to NestJS Logger only — pipe to a log aggregator (Loki, Datadog) in Phase 10
- `CORS_REJECTED` event logging is in `SecurityLogService` but not yet wired to the `buildCorsOriginValidator()` callback in `main.ts` — wire in Phase 10 when the full logging pipeline is available
- meetino-web CSP `unsafe-inline` + `unsafe-eval` required for LiveKit SDK — tighten with nonces in future
- PDF export files stored on local filesystem — add S3/R2 object storage in Phase 10
- Screen share multiplicity is managed entirely by the LiveKit SFU layer — Meetino's NestJS API has no hook into "participant started screen sharing." The frontend (`VideoGrid.tsx`) already renders multiple simultaneous sharers. `SecurityLogService.screenShareConflict()` exists as a stub for future enforcement. To enforce single-sharer policy: (a) use LiveKit room webhooks to detect new screen tracks, or (b) add a `SCREEN_SHARE_START` WebSocket event routed through `MeetingGateway` that checks presence state before granting permission. This is tracked as Phase 10 hardening work.

---

#### Phase 22.0 — PostgreSQL + Redis Smart Cache Strategy ✅

**Goal:** Reduce unnecessary database load, fix over-select bugs, centralise all Redis key construction, and add targeted application-level caching. No new product features.

**Migration:** `20260616000000_phase22_0_indexes_redis_cleanup`
```bash
cd apps/hub-api
pnpm db:migrate:dev   # adds 6 compound indexes
pnpm db:generate      # regenerates Prisma client
```

---

**A — Redis Key Namespace Policy**

All Redis keys in this project MUST be constructed via `apps/hub-api/src/redis/redis-keys.ts`.
**Never write inline key strings** (e.g. `` `irno:rt:${id}` ``) in service or controller code.

| Key | Constructor | TTL | Purpose |
|---|---|---|---|
| `irno:rt:{userId}` | `RedisKey.refreshToken(userId)` | 7d | Refresh token hash |
| `irno:otp:cooldown:{mobile}` | `RedisKey.otpCooldown(mobile)` | 60s (configurable) | OTP resend gate |
| `irno:otp:attempt:{mobile}` | `RedisKey.otpAttempt(mobile)` | 10m | Attempt counter (reserved) |
| `irno:sso:code:{code}` | `RedisKey.ssoCode(code)` | 60s (configurable) | One-time SSO exchange code |
| `irno:rate:{scope}:{identifier}` | `RedisKey.rateLimit(scope, id)` | window s | Rate-limit counters |
| `irno:pdf:lock:{resumeId}` | `RedisKey.pdfLock(resumeId)` | 120s | PDF generation lock (reserved) |
| `irno:cache:templates` | `RedisKey.cacheTemplates()` | 15min | Resume template list |
| `irno:cache:taxonomy:{type}` | `RedisKey.cacheTaxonomy(type)` | 5min | Taxonomy lookup per type |
| `irno:cache:public-profile:{slug}` | `RedisKey.cachePublicProfile(slug)` | 60s | Public career profile response |

**When adding a new Redis key:** add it to `redis-keys.ts` first, document TTL and purpose, then use the constructor everywhere.

---

**B — Redis vs PostgreSQL State Split**

| State type | Store | Reason |
|---|---|---|
| Session / refresh tokens | Redis | Ephemeral, revocable, O(1) lookup |
| OTP codes (hashed) | PostgreSQL | Auditable; one-time-use lifecycle tracked |
| OTP resend cooldown | Redis | Ephemeral gate; no need for persistence |
| SSO one-time codes | Redis | Short TTL; delete-on-use |
| Rate-limit counters | Redis | Ephemeral fixed-window INCR |
| PDF concurrency semaphore | In-process (future: Redis) | Single-instance for now; BullMQ when scaled |
| Resume templates list | Redis (cache) | Read-heavy, rarely changes |
| Taxonomy lookups per type | Redis (cache) | Read-heavy dropdown data |
| Public profile responses | Redis (cache) | Hot path; invalidated on write |
| All business records | PostgreSQL | Durable, relational, auditable |
| Financial data | PostgreSQL only | Never cache payment/installment data |
| Timeline events | PostgreSQL only | Append-only audit trail |
| Certificates | PostgreSQL only | Verifiable credentials |

**Rule:** Never cache financial data, payment status, or certificate status in Redis. These must always be read from PostgreSQL to guarantee correctness.

---

**C — Meetino State Split (Redis vs PostgreSQL)**

Meetino uses both Redis (via Socket.IO adapter) and PostgreSQL. Do not mix their roles.

**Redis (live, ephemeral):**
- Socket.IO room membership (which sockets are in which room) — managed by `@socket.io/redis-adapter`
- Live participant presence (joined/not joined) — ephemeral, lost on crash
- WebSocket event rate-limit counters per socket (in-process `Map`, not Redis)
- Meeting lock state if needed (future)

**PostgreSQL (durable):**
- Scheduled meetings: title, description, host, start time, settings
- Meeting lifecycle: created, started, ended, locked
- Participant history: who joined, when they left, was-kicked
- Attendance records: `leftAt`, `wasKicked`, `participantType`
- Chat message history (if persisted)
- Meeting reports and summaries
- Hub integration: `meetino_meeting_references`, `meetino_attendance_records`

**Rule:** A Meetino server crash must not lose any business data. All durable state goes to PostgreSQL. Redis is only live presence and pub/sub transport.

---

**D — PDF Export State Split**

| State | Location | Reason |
|---|---|---|
| Export metadata (status, format, fileUrl, error) | PostgreSQL `resume_exports` | Durable, auditable |
| PDF binary file | Local filesystem `storage/exports/{userId}/{exportId}.pdf` | Large binary, not suited for DB |
| In-process concurrency semaphore | In-process `PdfSemaphore` | Single instance; BullMQ for scale |
| Queue position / job status | BullMQ + Redis (future) | Async worker decoupling |
| Active Playwright browser instance | In-process singleton | Playwright browser is not serialisable |

**Production guidance:**
- Mount `storage/exports` as a persistent Docker volume or NFS/EFS share
- Never store PDF binary in PostgreSQL (TEXT/BYTEA field would bloat the DB)
- When horizontally scaling: migrate to object storage (S3/R2) + BullMQ worker process
- PDF export files are served by hub-api directly (`GET /exports/:id/download`) — add Nginx X-Accel-Redirect for large files in Phase 10

---

**E — Application Cache Policy**

All caches in hub-api use the **cache-aside (lazy-load)** pattern:

```
1. Try Redis GET(key)
2. On HIT → return parsed JSON
3. On MISS or Redis error → query PostgreSQL
4. Store result in Redis SET(key, value, ttl)
5. Return result
```

All Redis calls are wrapped in try/catch. Redis errors never propagate to the caller — the cache is **fail-open** (fall through to DB). This means the app works correctly even if Redis is down; performance degrades gracefully.

**Cache invalidation rules:**

| Cache | Invalidated when |
|---|---|
| `cacheTemplates()` | Any resume template is created, updated, or deleted |
| `cacheTaxonomy(type)` | Any taxonomy term of that type is created, updated, or archived |
| `cachePublicProfile(slug)` | Career profile settings updated (slug, visibility, contact config, SEO); any section updated/deleted/reordered; public settings changed |

**What is NOT cached:**
- Paginated admin list endpoints (too many filter combinations)
- Financial data (payment status, installments, revenue)
- Student CRM data (follow-up dates, notes)
- Notifications and notification preferences
- Any data that requires real-time accuracy

---

**F — PostgreSQL Compound Indexes Added (Phase 22.0)**

Migration: `20260616000000_phase22_0_indexes_redis_cleanup`

| Index | Table | Columns | Use case |
|---|---|---|---|
| `resume_sections_resumeDocumentId_sortOrder_idx` | `resume_sections` | `(resumeDocumentId, sortOrder)` | Load all sections for a resume in sorted order — single index scan |
| `resume_exports_resumeDocumentId_status_idx` | `resume_exports` | `(resumeDocumentId, status)` | Filter exports by resume + status |
| `resume_exports_userId_createdAt_idx` | `resume_exports` | `(userId, createdAt DESC)` | List all user exports ordered by date |
| `resume_check_reports_userId_createdAt_idx` | `resume_check_reports` | `(userId, createdAt DESC)` | List user check reports ordered by date |
| `portfolio_projects_careerProfileId_visibility_deletedAt_idx` | `portfolio_projects` | `(careerProfileId, visibility, deletedAt)` | Public profile portfolio: filter by profile + visibility + not-deleted |
| `job_match_reports_careerProfileId_createdAt_idx` | `job_match_reports` | `(careerProfileId, createdAt DESC)` | List user job match reports ordered by date |

All existing indexes (from prior migrations) remain. The schema also defines these model-level indexes added in Phase 22.0:
```prisma
// In schema.prisma
@@index([resumeDocumentId, sortOrder])         // ResumeSection
@@index([resumeDocumentId, status])            // ResumeExport
@@index([userId, createdAt])                   // ResumeExport, ResumeCheckReport
@@index([careerProfileId, visibility, deletedAt]) // PortfolioProject
@@index([careerProfileId, createdAt])          // JobMatchReport
```

---

**G — Over-Select Fixes (Phase 22.0)**

The following list endpoints previously loaded large text/JSON fields unnecessarily. Fixed with explicit Prisma `select`:

| Endpoint | Field removed from list select | Size |
|---|---|---|
| `listExports()` in `career-export.service.ts` | `htmlSnapshot` | Hundreds of KB per export |
| `listReports()` in `resume-checker.service.ts` | `sourceTextSnapshot`, `findings` | Up to 5000 chars + large JSON |
| `listJobMatchReports()` in `career.service.ts` | `jobDescriptionSnapshot` | Up to 5000 chars |

**Rule:** List endpoints must never select large TEXT or JSONB fields unless explicitly needed. Always add a Prisma `select` clause to list queries.

---

**H — OTP Cooldown Migration (DB → Redis)**

Before Phase 22.0, OTP resend cooldown was enforced by querying `otp_codes` table:
```sql
-- Old: PostgreSQL query on every OTP request
SELECT * FROM otp_codes WHERE mobile = $1 ORDER BY createdAt DESC LIMIT 1
```

After Phase 22.0, cooldown uses a Redis sentinel key:
```
irno:otp:cooldown:{normalizedMobile}   TTL = OTP_RESEND_COOLDOWN_SECONDS
```

- `EXISTS` check is O(1) vs PostgreSQL index scan
- Key is deleted on successful OTP verification (user can request a new code immediately)
- Fail-open: if Redis is unreachable, cooldown is skipped (OTP delivery is not blocked)
- Mobile numbers are normalised (`09xxxxxxxxx` format) before use as key component

---

**I — PostgreSQL Tuning Recommendations**

These are **recommended** `postgresql.conf` values for different RAM configurations. Apply in Phase 10 deployment.

**8 GB RAM (small VPS):**
```
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 16MB
maintenance_work_mem = 256MB
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 1GB
random_page_cost = 1.1          # if using SSD
effective_io_concurrency = 200  # if using SSD
```

**16 GB RAM (production VPS):**
```
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 32MB
maintenance_work_mem = 512MB
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 2GB
random_page_cost = 1.1
effective_io_concurrency = 200
```

**32 GB RAM (scaled production):**
```
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 64MB
maintenance_work_mem = 1GB
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB
random_page_cost = 1.1
effective_io_concurrency = 300
```

**Additional recommended settings (all environments):**
```
log_min_duration_statement = 200   # Log queries slower than 200ms
log_checkpoints = on
log_connections = on               # Remove in very high-traffic production
autovacuum = on                    # Never disable
autovacuum_vacuum_scale_factor = 0.05
autovacuum_analyze_scale_factor = 0.02
```

Run `ANALYZE;` after applying migrations and seeding. Run `VACUUM ANALYZE;` after bulk imports.

---

**J — Observability Checklist**

Apply in Phase 10. All items are pre-requisites for calling Irno production-ready.

**Metrics to export (Prometheus + Grafana recommended):**

| Metric | Source | Alert threshold |
|---|---|---|
| `hub_api_request_duration_ms` | NestJS middleware | p99 > 500ms |
| `hub_api_rate_limit_hits_total` | `RateLimitGuard` | > 100/min per endpoint |
| `hub_api_redis_errors_total` | `RedisService` catch blocks | > 5/min |
| `hub_api_pdf_queue_full_total` | `PdfSemaphore` | > 10/min |
| `hub_api_pdf_duration_ms` | `CareerPdfService` | p95 > 20s |
| `hub_api_cache_hit_ratio` | Cache-aside counters | < 0.5 for hot paths |
| `hub_api_db_query_duration_ms` | Prisma middleware | p99 > 300ms |
| PostgreSQL `pg_stat_user_tables.seq_scan` | Postgres exporter | Trend rising = missing index |
| PostgreSQL `pg_stat_bgwriter.checkpoints_timed` | Postgres exporter | High = increase `max_wal_size` |
| Redis `used_memory_rss` | Redis exporter | > 80% of `maxmemory` |
| Redis `keyspace_misses` vs `keyspace_hits` | Redis exporter | Miss ratio > 50% = cache ineffective |

**Logs to collect (Loki or similar):**
- All `SecurityLogService` events (structured JSON) — AUTH_FAILURE, RATE_LIMIT, SSO_ABUSE
- Slow query log from PostgreSQL (`log_min_duration_statement = 200`)
- NestJS error-level logs — unhandled exceptions, 500 responses
- PDF generation errors and timeouts
- Redis connection errors

**Health endpoints already implemented:**
- `GET /api/v1/health` — hub-api liveness + DB + Redis ping
- `GET /health` — Meetino API

**Alerts to configure:**
- Error rate > 1% of requests over 5 minutes
- P99 latency > 1s over 5 minutes
- Redis down > 30 seconds
- PostgreSQL replication lag > 10s (if using replica)
- Disk usage > 80% (for PDF export storage volume)
- OTP delivery failure rate > 20% over 10 minutes

**Tracing (optional, Phase 10+):**
- Add OpenTelemetry SDK to hub-api (`@opentelemetry/sdk-node`)
- Instrument NestJS HTTP, Prisma, and Redis spans
- Export to Jaeger or Tempo
- Correlate slow frontend requests to DB query chains

---

**Build/typecheck (Phase 22.0):**
- ✅ hub-api TypeScript: zero errors
- ✅ career-web TypeScript: zero errors

**New env vars (Phase 22.0):** None — all Redis cache behaviour uses existing `REDIS_URL`.

**Known limitations (Phase 22.0):**
- Taxonomy cache invalidated per-type — if a term changes, the entire type's lookup cache is cleared (acceptable; lookup results are small and rebuild is fast)
- Public profile cache TTL is 60s — a profile edit takes up to 60s to propagate to unauthenticated viewers; explicit invalidation on write reduces this to near-zero for authenticated writes
- Template cache TTL is 15min — admin template changes take up to 15min to appear to users; acceptable since templates change rarely
- In-process rate-limit counters and PDF semaphore are not shared across hub-api instances — horizontal scaling requires BullMQ + Redis distributed coordination (Phase 10)
- No cache warm-up on startup — first request after deploy hits the DB; Redis cache fills naturally on first access
