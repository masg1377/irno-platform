/**
 * ITelegramProvider — abstraction for Telegram bot message delivery.
 *
 * Implement this interface and register as TelegramProvider token to swap providers
 * without touching business logic.
 *
 * Current default: none (Telegram not implemented in MVP).
 * Future: add NOTIFICATION_TELEGRAM_PROVIDER=bot and implement BotProvider.
 */
export interface TelegramDeliveryResult {
  success: boolean
  providerMessageId?: string
  error?: string
}

export interface ITelegramProvider {
  sendTelegram(
    to: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<TelegramDeliveryResult>
  readonly providerName: string
  readonly enabled: boolean
}
