import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { OtpService } from './otp.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'

/**
 * AuthModule handles login, logout, token refresh, password changes,
 * and OTP-based mobile login/registration/activation (Phase 11.1).
 *
 * OTP delivery flow (Phase 11.2):
 *  OtpService — generates and verifies OTP codes (no SMS dependency)
 *  AuthService — orchestrates: create OTP → send via SmsService → respond
 *  SmsService  — injected from NotificationsModule (central delivery abstraction)
 *
 * SMS provider is controlled by NOTIFICATION_SMS_PROVIDER env var.
 * Default: mock (logs OTP to console — safe for dev).
 * To use a real provider: implement ISmsProvider and set NOTIFICATION_SMS_PROVIDER=<name>.
 */
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    JwtModule.register({}),
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService],
  exports: [AuthService, OtpService],
})
export class AuthModule {}
