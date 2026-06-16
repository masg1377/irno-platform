"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiEnvSchema = void 0;
const zod_1 = require("zod");
/**
 * Validates hub-api environment variables at startup.
 * Import this schema in ConfigModule to fail fast on misconfiguration.
 */
exports.apiEnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    // Database
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    // Redis
    REDIS_HOST: zod_1.z.string().default('localhost'),
    REDIS_PORT: zod_1.z.coerce.number().int().positive().default(6379),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    // JWT
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    // Server
    API_PORT: zod_1.z.coerce.number().int().positive().default(4000),
    API_CORS_ORIGIN: zod_1.z.string().default('http://localhost:3000'),
});
//# sourceMappingURL=env.js.map