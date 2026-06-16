import { Injectable, Logger } from '@nestjs/common'

/**
 * SecurityLogService — structured logging for security-relevant events.
 *
 * Rules:
 *  - NEVER log: passwords, OTP codes, JWT tokens, refresh tokens, secrets,
 *    full uploaded file contents, or sensitive personal data.
 *  - DO log: event type, timestamp, IP, userId (not email/phone), status code,
 *    route, reason. Use for audit trails and incident response.
 *
 * In production, pipe the structured output to your log aggregator
 * (e.g. Loki, CloudWatch, Datadog). The Logger.log() calls emit JSON
 * when NODE_ENV=production and a JSON logger is configured.
 */
@Injectable()
export class SecurityLogService {
  private readonly logger = new Logger('Security')

  /** Authentication failure (wrong password, expired token, etc.) */
  authFailure(opts: { ip: string; route: string; reason: string; userId?: string }) {
    this.logger.warn(
      JSON.stringify({
        event: 'AUTH_FAILURE',
        ...opts,
        at: new Date().toISOString(),
      }),
    )
  }

  /** Rate limit exceeded */
  rateLimitHit(opts: { ip: string; key: string; userId?: string; retryAfter?: number }) {
    this.logger.warn(
      JSON.stringify({
        event: 'RATE_LIMIT',
        ...opts,
        at: new Date().toISOString(),
      }),
    )
  }

  /** File upload rejected (bad type, too large, scanned PDF) */
  uploadRejected(opts: { ip: string; reason: string; userId?: string; filename?: string }) {
    this.logger.warn(
      JSON.stringify({
        event: 'UPLOAD_REJECTED',
        ...opts,
        // Strip filename extension to avoid logging potentially sensitive names
        filename: opts.filename ? `${opts.filename.slice(-10)}` : undefined,
        at: new Date().toISOString(),
      }),
    )
  }

  /** PDF export failed or queue full */
  pdfEvent(opts: { event: 'PDF_QUEUE_FULL' | 'PDF_TIMEOUT' | 'PDF_ERROR'; userId: string; reason?: string }) {
    this.logger.warn(
      JSON.stringify({
        ...opts,
        at: new Date().toISOString(),
      }),
    )
  }

  /** SSO code exchange attempt with invalid secret or redirect URI */
  ssoAbuse(opts: { ip: string; reason: string; redirectUri?: string }) {
    this.logger.warn(
      JSON.stringify({
        event: 'SSO_ABUSE',
        ip: opts.ip,
        reason: opts.reason,
        // Redact query params from redirect URI to avoid logging tokens
        redirectUri: opts.redirectUri
          ? opts.redirectUri.split('?')[0]
          : undefined,
        at: new Date().toISOString(),
      }),
    )
  }

  /** Unauthorized access attempt — correct auth but wrong ownership */
  unauthorizedAccess(opts: { userId: string; resource: string; resourceId: string }) {
    this.logger.warn(
      JSON.stringify({
        event: 'UNAUTHORIZED_ACCESS',
        ...opts,
        at: new Date().toISOString(),
      }),
    )
  }

  /** CORS rejection — origin not on allowlist */
  corsRejected(opts: { origin: string; route: string }) {
    this.logger.warn(
      JSON.stringify({
        event: 'CORS_REJECTED',
        ...opts,
        at: new Date().toISOString(),
      }),
    )
  }

  /** Meetino room full — join rejected */
  meetingRoomFull(opts: { meetingId: string; slug: string; participantCount: number; cap: number }) {
    this.logger.warn(
      JSON.stringify({
        event: 'MEETING_ROOM_FULL',
        ...opts,
        at: new Date().toISOString(),
      }),
    )
  }

  /** Screen share conflict — second share attempt */
  screenShareConflict(opts: { meetingId: string; requesterId: string; activeSharerParticipantId: string }) {
    this.logger.log(
      JSON.stringify({
        event: 'SCREEN_SHARE_CONFLICT',
        ...opts,
        at: new Date().toISOString(),
      }),
    )
  }
}
