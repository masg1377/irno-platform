import { Injectable, Logger } from '@nestjs/common'
import type { ISmsProvider, SmsDeliveryResult } from './sms-provider.interface'

/**
 * MockSmsProvider — default SMS provider for development and testing.
 *
 * Logs SMS content to console instead of sending a real message.
 * Activated when NOTIFICATION_SMS_PROVIDER=mock (the default).
 *
 * To add a real provider:
 * 1. Implement ISmsProvider (e.g. KavenegarSmsProvider)
 * 2. Set NOTIFICATION_SMS_PROVIDER=kavenegar in .env
 * 3. Instantiate the real provider in SmsService constructor
 */
@Injectable()
export class MockSmsProvider implements ISmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name)
  readonly providerName = 'mock'
  readonly enabled = true

  async sendSms(to: string, message: string): Promise<SmsDeliveryResult> {
    this.logger.log(`[MockSMS] To: ${to} | Message: ${message}`)
    return { success: true, providerMessageId: `mock-${Date.now()}` }
  }
}
