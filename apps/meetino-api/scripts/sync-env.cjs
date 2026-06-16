#!/usr/bin/env node
/**
 * sync-env.cjs — monorepo edition
 *
 * In the irno-platform monorepo each app manages its own .env file.
 * apps/meetino-api/.env is the local env for the Meetino API.
 *
 * This script is kept for compatibility with the prisma:* npm scripts but
 * is now a no-op. Prisma reads DATABASE_URL directly from apps/meetino-api/.env.
 *
 * To set up for the first time:
 *   cp apps/meetino-api/.env.example apps/meetino-api/.env
 *   # Edit the values for your local setup
 */
console.log('[env:sync] monorepo mode — Prisma reads from apps/meetino-api/.env directly');
console.log('[env:sync] If DATABASE_URL is missing, run: cp apps/meetino-api/.env.example apps/meetino-api/.env');
