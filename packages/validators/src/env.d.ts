import { z } from 'zod';
/**
 * Validates hub-api environment variables at startup.
 * Import this schema in ConfigModule to fail fast on misconfiguration.
 */
export declare const apiEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        production: "production";
        test: "test";
    }>>;
    DATABASE_URL: z.ZodString;
    REDIS_HOST: z.ZodDefault<z.ZodString>;
    REDIS_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    REDIS_PASSWORD: z.ZodOptional<z.ZodString>;
    JWT_SECRET: z.ZodString;
    JWT_ACCESS_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    JWT_REFRESH_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    API_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    API_CORS_ORIGIN: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type ApiEnv = z.infer<typeof apiEnvSchema>;
//# sourceMappingURL=env.d.ts.map