import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Redirect,
  Req,
  Res,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { IrnoSsoService, type SsoLoginResult } from './irno-sso.service';
import type { AppConfig } from '../../config/configuration';

const REFRESH_COOKIE = 'meetino_refresh';

class SsoExchangeDto {
  @IsString()
  @MinLength(8)
  code!: string;
}

/**
 * IrnoSsoController — Meetino-side endpoints for the Irno ID SSO handoff.
 *
 * GET  /api/auth/irno/start
 *   Redirects to the Hub SSO URL so the user can log in with their Irno account.
 *   Accept query param: redirect_uri (where to return inside Meetino after SSO).
 *   This endpoint is a convenience — the frontend can also build the URL directly.
 *
 * POST /api/auth/irno/exchange
 *   Meetino backend exchanges the one-time SSO code with Hub API server-to-server.
 *   Returns a Meetino access token and sets a Meetino refresh cookie.
 *   The Hub access token is NEVER passed to the browser.
 */
@Controller('auth/irno')
export class IrnoSsoController {
  constructor(
    private readonly sso: IrnoSsoService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /**
   * GET /api/auth/irno/start?redirect_uri=<meetino_return_path>
   *
   * Builds the Hub SSO URL and redirects the browser there.
   * The browser ends up at: <HUB_WEB_URL>/sso/meetino?redirect_uri=<meetino_callback>
   *
   * redirect_uri (optional): where to go INSIDE Meetino after SSO (e.g. /m/abc/prejoin).
   * If omitted, Meetino callback defaults to /dashboard.
   *
   * The actual callback URL (received by Hub) is always:
   *   <MEETINO_WEB_ORIGIN>/auth/irno/callback?returnTo=<redirect_uri>
   */
  @Public()
  @Get('start')
  start(
    @Query('redirect_uri') returnTo: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    if (!this.sso.isEnabled) {
      res.status(503).json({ error: 'Irno SSO is not enabled on this server' });
      return;
    }

    const webOrigin = this.config.get('cors', { infer: true }).webOrigin;
    const hubWebUrl = this.sso.hubWebUrl;

    // Callback URL that Hub will redirect to after login
    const callbackUrl = new URL('/auth/irno/callback', webOrigin);
    if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
      callbackUrl.searchParams.set('returnTo', returnTo);
    }

    // Hub SSO entry point
    const hubSsoUrl = new URL('/sso/meetino', hubWebUrl);
    hubSsoUrl.searchParams.set('redirect_uri', callbackUrl.toString());

    res.redirect(hubSsoUrl.toString());
  }

  /**
   * POST /api/auth/irno/exchange
   *
   * Called by Meetino web callback page immediately after Hub redirects back.
   * The browser sends the code; this handler exchanges it server-to-server with Hub.
   *
   * On success: returns a Meetino access token + sets meetino_refresh cookie.
   * The Hub SSO code and Meetino client secret are NEVER sent to the browser.
   */
  @Public()
  @Post('exchange')
  @HttpCode(HttpStatus.OK)
  async exchange(
    @Body() dto: SsoExchangeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result: SsoLoginResult = await this.sso.exchangeAndLogin(dto.code, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const isProd = this.config.get('nodeEnv', { infer: true }) === 'production';
    res.cookie(REFRESH_COOKIE, result.refreshTokenRaw, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      expires: result.refreshTokenExpiresAt,
    });

    // Return only the public fields — refresh token stays in the cookie only
    return {
      accessToken: result.accessToken,
      accessTokenExpiresIn: result.accessTokenExpiresIn,
      user: result.user,
    };
  }
}
