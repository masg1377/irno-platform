/**
 * Prisma 7 configuration file.
 *
 * In Prisma 7, the database connection URL is no longer specified in
 * schema.prisma. Instead it lives here, used by the Prisma CLI for:
 *   - prisma migrate dev / deploy
 *   - prisma db seed
 *   - prisma studio
 *
 * The PrismaClient runtime connection is configured separately in
 * prisma.service.ts via the `datasourceUrl` constructor option.
 *
 * dotenv/config loads apps/hub-api/.env (copy of .env.example).
 * In production, DATABASE_URL is set as a real env var — dotenv is a no-op.
 */
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
