/**
 * ISmsProvider — abstraction for SMS delivery (mock, Kavenegar, FarazSMS, etc.)
 *
 * Implement this interface and register as SmsProvider token to swap providers
 * without touching business logic.
 *
 * Current default: MockSmsProvider (NOTIFICATION_SMS_PROVIDER=mock — logs to console).
 * Future: add NOTIFICATION_SMS_PROVIDER=kavenegar and implement KavenegarSmsProvider.
 */
export interface SmsDeliveryResult {
  success: boolean
  providerMessageId?: string
  error?: string
}

export interface ISmsProvider {
  sendSms(to: string, message: string): Promise<SmsDeliveryResult>
  readonly providerName: string
  readonly enabled: boolean
}
