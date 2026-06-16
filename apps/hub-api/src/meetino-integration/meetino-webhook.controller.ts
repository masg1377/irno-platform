import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common'
import { Public } from '../auth/decorators/public.decorator'
import { MeetinoClientService } from './meetino-client.service'

/**
 * MeetinoWebhookController
 *
 * Foundation stub for receiving webhooks from Meetino.
 *
 * Meetino does NOT currently support webhooks. This controller is prepared
 * for when Meetino adds webhook dispatch capability.
 *
 * Expected Meetino webhook events (future):
 *   meeting.started  — update reference status to LIVE
 *   meeting.ended    — update reference status to ENDED
 *   participant.joined
 *   participant.left
 *   attendance.ready — trigger attendance sync
 *   report.ready     — trigger report sync
 *
 * Security: every webhook request must include
 *   X-Meetino-Signature: sha256=<hmac-sha256 of body using MEETINO_WEBHOOK_SECRET>
 */
@Controller('integrations/meetino/webhooks')
export class MeetinoWebhookController {
  private readonly logger = new Logger(MeetinoWebhookController.name)

  constructor(private readonly client: MeetinoClientService) {}

  /**
   * POST /api/v1/integrations/meetino/webhooks
   *
   * @Public() — Meetino calls this without Hub JWT.
   * Signature validation replaces auth.
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: unknown,
    @Headers('x-meetino-signature') signature?: string,
  ) {
    // Validate signature before processing anything
    const payload = JSON.stringify(body)
    const valid = this.client.validateWebhookSignature(payload, signature ?? '')

    if (!valid) {
      this.logger.warn('Meetino webhook rejected: invalid or missing signature')
      throw new UnauthorizedException('Invalid webhook signature')
    }

    const event = body as { event?: string; data?: unknown }
    this.logger.log(`Meetino webhook received: ${event.event ?? 'unknown'}`)

    // TODO: implement handlers per event type once Meetino webhook support is added:
    // switch (event.event) {
    //   case 'meeting.started':   await this.handleMeetingStarted(event.data); break
    //   case 'meeting.ended':     await this.handleMeetingEnded(event.data); break
    //   case 'attendance.ready':  await this.handleAttendanceReady(event.data); break
    // }

    return { received: true }
  }
}
