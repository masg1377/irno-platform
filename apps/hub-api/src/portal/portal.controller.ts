import {
  Controller,
  Get,
  Patch,
  Body,
} from '@nestjs/common'
import { PortalService } from './portal.service'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import { UpdatePortalProfileDto } from './dto/update-portal-profile.dto'
import type { CurrentUser } from '@irno/types'

/**
 * PortalController — self-service API for applicants and students.
 *
 * Base path: /api/v1/portal
 *
 * All endpoints use the current authenticated user's identity.
 * No userId param — portal routes are always scoped to "me".
 * Admin data (internal notes, staff assignments, other users) is never exposed.
 */
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  /**
   * GET /api/v1/portal/me
   * Full portal identity: user + profile + applicant/student summary + available sections.
   */
  @Get('me')
  async getPortalMe(@CurrentUserDec() user: CurrentUser) {
    return this.portalService.getPortalMe(user)
  }

  /**
   * GET /api/v1/portal/applicant
   * Applicant CRM summary for self-registered or converted users.
   */
  @Get('applicant')
  async getPortalApplicant(@CurrentUserDec() user: CurrentUser) {
    return this.portalService.getPortalApplicant(user)
  }

  /**
   * GET /api/v1/portal/student
   * Student profile summary (studentCode, status, enrollment count).
   */
  @Get('student')
  async getPortalStudent(@CurrentUserDec() user: CurrentUser) {
    return this.portalService.getPortalStudent(user)
  }

  /**
   * GET /api/v1/portal/enrollments
   * Current user's own enrollment list (scoped to their student record).
   */
  @Get('enrollments')
  async getPortalEnrollments(@CurrentUserDec() user: CurrentUser) {
    return this.portalService.getPortalEnrollments(user)
  }

  /**
   * GET /api/v1/portal/payments
   * Current student's own payment summaries.
   */
  @Get('payments')
  async getPortalPayments(@CurrentUserDec() user: CurrentUser) {
    return this.portalService.getPortalPayments(user)
  }

  /**
   * GET /api/v1/portal/installments
   * Current student's own installments with overdue status computed on read.
   */
  @Get('installments')
  async getPortalInstallments(@CurrentUserDec() user: CurrentUser) {
    return this.portalService.getPortalInstallments(user)
  }

  /**
   * GET /api/v1/portal/events
   * Current user's registered events with Meetino join URL if applicable.
   */
  @Get('events')
  async getPortalEvents(@CurrentUserDec() user: CurrentUser) {
    return this.portalService.getPortalEvents(user)
  }

  /**
   * GET /api/v1/portal/meetino-links
   * Meetino meeting references the current user is allowed to access
   * (from active enrollments + approved event registrations).
   */
  @Get('meetino-links')
  async getPortalMeetinoLinks(@CurrentUserDec() user: CurrentUser) {
    return this.portalService.getPortalMeetinoLinks(user)
  }

  /**
   * PATCH /api/v1/portal/profile
   * Update own profile fields (firstName, lastName, email, city, avatarUrl).
   * Mobile change is NOT allowed through this endpoint.
   * Role, status, and studentCode changes are blocked.
   */
  @Patch('profile')
  async updatePortalProfile(
    @CurrentUserDec() user: CurrentUser,
    @Body() dto: UpdatePortalProfileDto,
  ) {
    return this.portalService.updatePortalProfile(user, dto)
  }

  /**
   * GET /api/v1/portal/skills
   * Current student's awarded skills (no evidenceNote).
   */
  @Get('skills')
  async getPortalSkills(@CurrentUserDec() user: CurrentUser) {
    return this.portalService.getPortalSkills(user)
  }

  /**
   * GET /api/v1/portal/credits
   * Current student's awarded credits (no evidenceNote).
   */
  @Get('credits')
  async getPortalCredits(@CurrentUserDec() user: CurrentUser) {
    return this.portalService.getPortalCredits(user)
  }
}
