/**
 * IPushProvider — abstraction for push notification delivery (FCM, APNs, etc.)
 *
 * Implement this interface and register as PushProvider token to swap providers
 * without touching business logic.
 *
 * Current default: none (push not implemented in MVP).
 * Future: FirebaseFcmProvider (optional, requires NOTIFICATION_PUSH_PROVIDER=fcm)
 */
export interface PushDeliveryResult {
  success: boolean
  providerMessageId?: string
  error?: string
}

export interface IPushProvider {
  sendPush(
    to: string,
    title: string,
    body: string,
    metadata?: Record<string, unknown>,
  ): Promise<PushDeliveryResult>
  readonly providerName: string
  readonly enabled: boolean
}
