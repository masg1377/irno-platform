import { z } from 'zod'

/**
 * Validates hub-api environment variables at startup.
 * Import this schema in ConfigModule to fail fast on misconfiguration.
 */
export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),

  // Server
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Seed (optional — only needed when running prisma/seed.ts)
  SUPER_ADMIN_MOBILE: z.string().optional(),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD: z.string().min(8).optional(),

  // Meetino Integration (Phase 9 — all optional, integration gracefully disabled if absent)
  // API key is used as a Bearer token for a Meetino service account.
  // Create a dedicated user in Meetino and obtain their JWT for server-to-server calls.
  MEETINO_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  MEETINO_WEB_URL: z.string().url().optional(),
  MEETINO_API_URL: z.string().url().optional(),
  MEETINO_API_KEY: z.string().optional(),
  MEETINO_API_SECRET: z.string().optional(),
  MEETINO_WEBHOOK_SECRET: z.string().optional(),
  MEETINO_OPEN_IN_NEW_TAB: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),

  // Meetino SSO / Irno ID Handoff (Phase 9.1)
  MEETINO_CLIENT_SECRET: z.string().optional(),
  MEETINO_SSO_CODE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  MEETINO_ALLOWED_REDIRECT_URLS: z.string().optional(),

  // OTP — Mobile-based login & account activation (Phase 11.1)
  // OTP_TTL_SECONDS: how long an OTP is valid (default 2 minutes)
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  // OTP_MAX_ATTEMPTS: wrong code attempts before OTP is invalidated
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  // OTP_RESEND_COOLDOWN_SECONDS: minimum seconds between resend requests per mobile
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),

  // ── Notification Delivery Providers (Phase 11.2) ──────────────────────────
  // Provider-agnostic architecture — swap provider by changing env var only.
  // No module should send SMS/push/email/telegram directly.
  //
  // NOTIFICATION_SMS_PROVIDER:
  //   'mock'      — log to console (default, development)
  //   'kavenegar' — implement KavenegarSmsProvider and set here
  //   'farazsms'  — implement FarazSmsProvider and set here
  NOTIFICATION_SMS_PROVIDER: z.string().default('mock'),
  //
  // NOTIFICATION_PUSH_PROVIDER:
  //   'none'  — push not active (default)
  //   'fcm'   — Firebase FCM (optional, future — requires FIREBASE_* vars below)
  NOTIFICATION_PUSH_PROVIDER: z.string().default('none'),
  //
  // NOTIFICATION_EMAIL_PROVIDER:
  //   'none'  — email not active (default)
  //   'smtp'  — implement SmtpEmailProvider and set here
  NOTIFICATION_EMAIL_PROVIDER: z.string().default('none'),
  //
  // NOTIFICATION_TELEGRAM_PROVIDER:
  //   'none'  — telegram not active (default)
  //   'bot'   — implement TelegramBotProvider and set here
  NOTIFICATION_TELEGRAM_PROVIDER: z.string().default('none'),

  // ── Optional Firebase / FCM vars (FUTURE — NOT required to run the app) ──
  // Only used when NOTIFICATION_PUSH_PROVIDER=fcm is set.
  // Do NOT set these in development unless specifically testing push notifications.
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // ── Career Studio / PDF Export (Phase 20.1 / 20.2) ───────────────────────
  // CAREER_WEB_URL: URL of the career-web app (for CORS and link generation)
  CAREER_WEB_URL: z.string().optional(),
  //
  // EXPORT_STORAGE_PATH: Absolute path for PDF file storage.
  //   Default: {cwd}/storage/exports
  //   In production: mount as a persistent volume and set this to the mount path.
  EXPORT_STORAGE_PATH: z.string().optional(),
  //
  // PDF_EXPORT_ENABLED: Set to 'false' to disable PDF generation without code changes.
  //   Default: true. Useful during maintenance or when Chromium is not installed.
  PDF_EXPORT_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
  //
  // PDF_EXPORT_CONCURRENCY: Max simultaneous Playwright PDF jobs.
  //   Default: 1. For a 2-CPU VPS, keep at 1. Increase only with dedicated PDF workers.
  PDF_EXPORT_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(1),
  //
  // PDF_EXPORT_QUEUE_MAX: Max number of PDF jobs waiting in queue.
  //   When exceeded, new requests get a 429 response.
  //   Default: 5. Set to 0 to disable queuing entirely (immediate 429 when busy).
  PDF_EXPORT_QUEUE_MAX: z.coerce.number().int().min(0).max(50).default(5),
  //
  // PDF_EXPORT_TIMEOUT_MS: Max milliseconds for a single PDF generation job.
  //   Includes page.setContent() + page.pdf() time. Google Fonts fetch counts.
  //   Default: 30000 (30 seconds). Increase if fonts are slow to load.
  PDF_EXPORT_TIMEOUT_MS: z.coerce.number().int().min(5000).max(120000).default(30000),
})

export type ApiEnv = z.infer<typeof apiEnvSchema>
