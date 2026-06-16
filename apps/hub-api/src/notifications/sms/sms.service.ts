import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { MockSmsProvider } from './mock-sms.provider'
import type { ISmsProvider, SmsDeliveryResult } from './sms-provider.interface'
import type { ApiEnv } from '@irno/validators'
import { NotificationChannel, NotificationStatus } from '@irno/types'

/**
 * SmsService — central SMS delivery abstraction.
 *
 * All modules that need to send an SMS must inject and call this service.
 * No module should call an SMS provider directly.
 *
 * Provider is selected at startup from NOTIFICATION_SMS_PROVIDER env var:
 *   mock      — logs to console (default, development)
 *   kavenegar — implement KavenegarSmsProvider and add case below
 *   farazsms  — implement FarazSmsProvider and add case below
 *
 * To add a real provider:
 *   1. Create src/notifications/sms/<name>-sms.provider.ts implementing ISmsProvider
 *   2. Add a case in the switch below
 *   3. Set NOTIFICATION_SMS_PROVIDER=<name> in .env
 *   4. Add any required env vars (API keys etc.) to env schema
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name)
  private readonly provider: ISmsProvider

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<ApiEnv>,
  ) {
    const providerName =
      this.config.get('NOTIFICATION_SMS_PROVIDER', { infer: true }) ?? 'mock'

    switch (providerName) {
      case 'mock':
      default:
        if (providerName !== 'mock') {
          this.logger.warn(
            `Unknown NOTIFICATION_SMS_PROVIDER="${providerName}", falling back to mock.`,
          )
        }
        this.provider = new MockSmsProvider()
        break
    }

    this.logger.log(`SMS provider: ${this.provider.providerName}`)
  }

  /**
   * Send an SMS message.
   *
   * If notificationId is provided, a NotificationDelivery record is created
   * for audit/tracking purposes. For transient messages (e.g. OTP), omit it.
   */
  async send(
    to: string,
    message: string,
    notificationId?: string,
  ): Promise<SmsDeliveryResult> {
    const result = await this.provider.sendSms(to, message)

    if (notificationId) {
      try {
        await (this.prisma as unknown as {
          notificationDelivery: { create: (args: unknown) => Promise<unknown> }
        }).notificationDelivery.create({
          data: {
            notificationId,
            channel: NotificationChannel.SMS,
            status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
            provider: this.provider.providerName,
            providerMessageId: result.providerMessageId ?? null,
            errorMessage: result.error ?? null,
            sentAt: result.success ? new Date() : null,
          },
        })
      } catch {
        // Non-fatal — log but do not throw
        this.logger.error('Failed to record SMS delivery log')
      }
    }

    return result
  }

  /** The active provider name — used by callers to detect mock/dev mode. */
  get providerName(): string {
    return this.provider.providerName
  }

  /** Whether the active provider is enabled. */
  get enabled(): boolean {
    return this.provider.enabled
  }
}
