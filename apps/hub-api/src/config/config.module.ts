import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import type { ZodIssue } from 'zod'
import { apiEnvSchema } from '@irno/validators'

/**
 * AppConfigModule wraps NestJS ConfigModule with strict Zod validation.
 * Application startup fails immediately if any required env var is missing
 * or malformed. No silent misconfigurations.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: (config) => {
        const result = apiEnvSchema.safeParse(config)
        if (!result.success) {
          const errors = result.error.issues
            .map((e: ZodIssue) => `  ${e.path.join('.')}: ${e.message}`)
            .join('\n')
          throw new Error(`\n❌  Environment validation failed:\n${errors}\n`)
        }
        return result.data
      },
    }),
  ],
})
export class AppConfigModule {}
