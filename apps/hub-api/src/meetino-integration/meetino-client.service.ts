import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/**
 * MeetinoClientService
 *
 * Handles server-to-server HTTP communication with the Meetino API.
 *
 * Authentication strategy:
 *   Meetino uses JWT bearer tokens for registered users. There is currently
 *   no dedicated service-account / API-key endpoint. To enable Hub→Meetino
 *   API calls, create a dedicated "hub-service" user in Meetino, log in once
 *   to obtain their access token, and set MEETINO_API_KEY to that token.
 *
 *   TODO (Meetino side): Add a long-lived service-account token or API-key
 *   endpoint to Meetino so Hub can make server-to-server calls without a
 *   user JWT that expires.
 *
 * When MEETINO_ENABLED=false or MEETINO_API_URL is not set, all methods
 * return null/disabled results without throwing. Hub never crashes because
 * Meetino is unreachable.
 */
@Injectable()
export class MeetinoClientService {
  private readonly logger = new Logger(MeetinoClientService.name)

  constructor(private readonly config: ConfigService) {}

  private get enabled(): boolean {
    return this.config.get<boolean>('MEETINO_ENABLED', false)
  }

  private get apiUrl(): string | undefined {
    return this.config.get<string>('MEETINO_API_URL')
  }

  private get apiKey(): string | undefined {
    return this.config.get<string>('MEETINO_API_KEY')
  }

  get webUrl(): string | undefined {
    return this.config.get<string>('MEETINO_WEB_URL')
  }

  get webhookSecret(): string | undefined {
    return this.config.get<string>('MEETINO_WEBHOOK_SECRET')
  }

  get openInNewTab(): boolean {
    return this.config.get<boolean>('MEETINO_OPEN_IN_NEW_TAB', true)
  }

  isConfigured(): boolean {
    return !!(this.enabled && this.apiUrl && this.apiKey)
  }

  isWebConfigured(): boolean {
    return !!this.webUrl
  }

  buildJoinUrl(slug: string): string {
    const base = this.webUrl ?? 'http://meetino.local'
    return `${base.replace(/\/$/, '')}/m/${slug}`
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }
    return headers
  }

  /**
   * Create a meeting in Meetino via its REST API.
   * Returns meeting data (id, slug) on success, null if integration is disabled or fails.
   *
   * Meetino endpoint: POST /api/meetings
   * Body: { title, description?, scheduledFor? }
   * Response: MeetingDto { id, slug, title, status, ... }
   */
  async createMeeting(params: {
    title: string
    startsAt?: string
  }): Promise<{ id: string; slug: string; joinUrl: string } | null> {
    if (!this.isConfigured()) {
      this.logger.warn('createMeeting skipped — Meetino integration not configured')
      return null
    }

    const url = `${this.apiUrl!.replace(/\/$/, '')}/api/meetings`
    const body = {
      title: params.title,
      ...(params.startsAt ? { scheduledFor: params.startsAt } : {}),
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      })

      if (!res.ok) {
        const text = await res.text()
        this.logger.error(`Meetino createMeeting failed: ${res.status} — ${text}`)
        return null
      }

      const data = (await res.json()) as { id?: string; slug?: string }
      if (!data.id || !data.slug) {
        this.logger.error('Meetino createMeeting: unexpected response shape', data)
        return null
      }

      return {
        id: data.id,
        slug: data.slug,
        joinUrl: this.buildJoinUrl(data.slug),
      }
    } catch (err) {
      this.logger.error('Meetino createMeeting exception', err)
      return null
    }
  }

  /**
   * Fetch meeting metadata from Meetino.
   * Meetino endpoint: GET /api/meetings/public/:slug (public, no auth needed)
   */
  async getMeeting(slug: string): Promise<{
    slug: string
    title: string
    status: string
  } | null> {
    const baseUrl = this.apiUrl ?? this.webUrl
    if (!baseUrl) return null

    const url = `${baseUrl.replace(/\/$/, '')}/api/meetings/public/${slug}`
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) return null
      const data = await res.json() as { slug?: string; title?: string; status?: string }
      if (!data.slug) return null
      return { slug: data.slug, title: data.title ?? '', status: data.status ?? 'UNKNOWN' }
    } catch {
      return null
    }
  }

  /**
   * Fetch meeting details/attendance report from Meetino.
   * Meetino endpoint: GET /api/meetings/:slug/details (requires auth as host/admin)
   *
   * TODO: This endpoint requires the service account to be the HOST of the meeting.
   * Hub must create meetings using the service account so it can fetch reports.
   */
  async getMeetingReport(slug: string): Promise<{
    participants: Array<{
      id: string
      userId?: string
      displayName: string
      role: string
      type: string
      joinedAt?: string
      leftAt?: string
      durationSeconds?: number
      wasGuest: boolean
    }>
  } | null> {
    if (!this.isConfigured()) {
      this.logger.warn('getMeetingReport skipped — Meetino integration not configured')
      return null
    }

    const url = `${this.apiUrl!.replace(/\/$/, '')}/api/meetings/${slug}/details`
    try {
      const res = await fetch(url, {
        headers: this.buildHeaders(),
        signal: AbortSignal.timeout(15_000),
      })

      if (!res.ok) {
        this.logger.warn(`getMeetingReport: ${res.status} for slug=${slug}`)
        return null
      }

      const data = await res.json() as {
        attendance?: Array<{
          participantId?: string
          userId?: string
          displayName?: string
          role?: string
          type?: string
          joinedAt?: string
          leftAt?: string
          durationSeconds?: number
          wasGuest?: boolean
        }>
      }

      const participants = (data.attendance ?? []).map((p) => ({
        id: p.participantId ?? '',
        userId: p.userId,
        displayName: p.displayName ?? '',
        role: p.role ?? 'PARTICIPANT',
        type: p.type ?? 'REGISTERED',
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        durationSeconds: p.durationSeconds,
        wasGuest: p.wasGuest ?? false,
      }))

      return { participants }
    } catch (err) {
      this.logger.error('getMeetingReport exception', err)
      return null
    }
  }

  /**
   * Validate webhook signature from Meetino.
   * Meetino does not currently have webhook support — this is a foundation stub.
   *
   * TODO (Meetino side): Add webhook dispatch with HMAC-SHA256 signature on the payload.
   * Expected header: X-Meetino-Signature: sha256=<hmac>
   */
  validateWebhookSignature(_payload: string, _signature: string): boolean {
    const secret = this.webhookSecret
    if (!secret) {
      this.logger.warn('validateWebhookSignature: MEETINO_WEBHOOK_SECRET not set — rejecting all webhooks')
      return false
    }
    // TODO: implement HMAC-SHA256 comparison when Meetino adds webhook support
    // const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex')
    // return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    return false
  }

  /**
   * Test connection to Meetino API.
   * Uses the public health endpoint which requires no auth.
   */
  async testConnection(): Promise<{ ok: boolean; message: string; latencyMs: number | null }> {
    const baseUrl = this.apiUrl ?? this.webUrl
    if (!baseUrl) {
      return { ok: false, message: 'MEETINO_API_URL not configured', latencyMs: null }
    }

    const url = `${baseUrl.replace(/\/$/, '')}/health`
    const start = Date.now()
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5_000) })
      const latencyMs = Date.now() - start
      if (res.ok) {
        return { ok: true, message: 'اتصال با موفقیت برقرار شد', latencyMs }
      }
      return { ok: false, message: `HTTP ${res.status}`, latencyMs }
    } catch (err: unknown) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Connection failed',
        latencyMs: null,
      }
    }
  }
}
