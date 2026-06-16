/**
 * IEmailProvider — abstraction for email delivery (SMTP, SendGrid, Mailgun, etc.)
 *
 * Implement this interface and register as EmailProvider token to swap providers
 * without touching business logic.
 *
 * Current default: none (email not implemented in MVP).
 * Future: add NOTIFICATION_EMAIL_PROVIDER=smtp or similar.
 */
export interface EmailDeliveryResult {
  success: boolean
  providerMessageId?: string
  error?: string
}

export interface IEmailProvider {
  sendEmail(
    to: string,
    subject: string,
    body: string,
    metadata?: Record<string, unknown>,
  ): Promise<EmailDeliveryResult>
  readonly providerName: string
  readonly enabled: boolean
}
