import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'

/**
 * Module-level security logger — uses the same context ('Security') as
 * SecurityLogService so log aggregators see all security events uniformly.
 * Created here because CORS callbacks fire at request-time, after the NestJS
 * DI container is ready, but SecurityLogService cannot be injected into the
 * CORS callback closure without hoisting it out of DI.
 */
const securityLogger = new Logger('Security')

function logCorsRejected(origin: string): void {
  securityLogger.warn(
    JSON.stringify({
      event: 'CORS_REJECTED',
      origin,
      route: 'CORS',
      at: new Date().toISOString(),
    }),
  )
}

/**
 * Parse comma-separated CORS origins from env.
 *
 * API_CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
 *
 * Returns a callback-based origin validator so each request's Origin is
 * checked individually. Unlisted origins receive a CORS error.
 *
 * Wildcard ('*') is explicitly forbidden when credentials=true.
 */
function buildCorsOriginValidator(
  originsEnv: string | undefined,
  isProd: boolean,
): (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => void {
  // ── Development: allow any localhost/127.0.0.1 origin ───────────────────────
  // This lets you run hub-web, career-web, meetino-web on any port without
  // editing env vars. No CORS headers leak out of the machine (loopback only).
  if (!isProd) {
    return (origin, callback) => {
      if (!origin) return callback(null, true)
      const isLocal =
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin === 'http://localhost' ||
        origin === 'http://127.0.0.1'
      if (isLocal) return callback(null, true)
      // Non-localhost in dev (e.g. accidental external origin)
      logCorsRejected(origin)
      callback(new Error(`CORS: origin ${origin} not allowed`))
    }
  }

  // ── Production: strict explicit allowlist ────────────────────────────────────
  // Set API_CORS_ORIGINS=https://hub.irno.academy,https://cv.irno.academy,...
  // Wildcard ('*') is intentionally forbidden when credentials=true.
  const raw = originsEnv ?? ''
  const allowed = new Set(
    raw.split(',').map((s) => s.trim()).filter(Boolean),
  )

  return (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowed.has(origin)) {
      callback(null, true)
    } else {
      logCorsRejected(origin)
      callback(new Error(`CORS: origin ${origin} not allowed`))
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // In production use structured JSON logger (pipe to aggregator)
    logger: process.env['NODE_ENV'] === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug'],
  })

  const isProd = process.env['NODE_ENV'] === 'production'

  // ── Security headers (helmet) ─────────────────────────────
  // helmet() sets: X-Content-Type-Options, X-Frame-Options,
  // X-XSS-Protection, Referrer-Policy, Permissions-Policy, etc.
  // CSP is deliberately NOT set here — it belongs on the API server
  // only for response headers on HTML payloads (we have none).
  // hub-web and career-web set their own CSP in next.config.ts.
  app.use(
    helmet({
      // Disable CSP on API (JSON-only responses — no HTML)
      contentSecurityPolicy: false,
      // HSTS — set by Nginx in production; omit to avoid duplicate
      strictTransportSecurity: isProd
        ? { maxAge: 31_536_000, includeSubDomains: true }
        : false,
    }),
  )

  // ── Cookie parser ─────────────────────────────────────────
  app.use(cookieParser())

  // ── Request body limits ───────────────────────────────────
  // Express default is 100kb. Set 1MB for API JSON (generous for resumes).
  // Multipart (file uploads) size is enforced separately in Multer options.
  app.useBodyParser('json', { limit: '1mb' })
  app.useBodyParser('urlencoded', { extended: true, limit: '1mb' })

  // ── CORS ─────────────────────────────────────────────────
  // Multi-origin support: hub-web + career-web + meetino-web (+ any others).
  // Set API_CORS_ORIGINS=http://localhost:3000,http://localhost:3002,http://localhost:3001
  const corsOriginValidator = buildCorsOriginValidator(
    process.env['API_CORS_ORIGINS'],
    isProd,
  )
  app.enableCors({
    origin: corsOriginValidator,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // Expose no additional headers to JS (security best practice)
    exposedHeaders: [],
  })

  // ── API prefix ────────────────────────────────────────────
  app.setGlobalPrefix('api/v1')

  // ── Global validation pipe ────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  )

  // ── Global filters and interceptors ──────────────────────
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new ResponseInterceptor())

  // ── Graceful shutdown ─────────────────────────────────────
  app.enableShutdownHooks()

  const port = parseInt(process.env['API_PORT'] ?? '4000', 10)
  await app.listen(port)

  console.log(`\n🚀  Irno Hub API running on: http://localhost:${port}/api/v1`)
  console.log(`   Health: http://localhost:${port}/api/v1/health/live`)
  console.log(`   Ready:  http://localhost:${port}/api/v1/health/ready\n`)
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err)
  process.exit(1)
})
