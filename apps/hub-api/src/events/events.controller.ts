import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common'
import { EventsService } from './events.service'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import { UserRole, EventType, EventDeliveryMode, EventRegistrationMode, EventStatus, EventRegistrationStatus, EventRegistrationPaymentStatus } from '@irno/types'
import type { CurrentUser } from '@irno/types'
import { MeetinoIntegrationService } from '../meetino-integration/meetino-integration.service'
import { AttachMeetinoMeetingDto } from '../meetino-integration/dto/attach-meeting.dto'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { UpdateEventStatusDto } from './dto/update-event-status.dto'
import { CreateEventRegistrationDto } from './dto/create-event-registration.dto'
import { UpdateEventRegistrationStatusDto } from './dto/update-event-registration-status.dto'
import { RecordEventPaymentDto } from './dto/record-event-payment.dto'
import { CreateEventEligibilityRuleDto } from './dto/create-event-eligibility-rule.dto'
import { CheckEligibilityDto } from './dto/check-eligibility.dto'
import { CreateEventReminderDto } from './dto/create-event-reminder.dto'
import { SendEventAnnouncementDto } from './dto/send-event-announcement.dto'

const ALL_STAFF = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.TEACHER, UserRole.MENTOR]
const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN]
const FINANCE_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT]
const CHECKIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.MENTOR]

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly meetinoIntegration: MeetinoIntegrationService,
  ) {}

  // ── Events ────────────────────────────────────────────────

  @Get()
  @Roles(...ALL_STAFF)
  list(
    @Query('type') type?: EventType,
    @Query('deliveryMode') deliveryMode?: EventDeliveryMode,
    @Query('registrationMode') registrationMode?: EventRegistrationMode,
    @Query('status') status?: EventStatus,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.eventsService.findAll({
      type, deliveryMode, registrationMode, status, search, categoryId, fromDate, toDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Post()
  @Roles(...ADMIN_ROLES)
  create(@Body() dto: CreateEventDto, @CurrentUserDec() actor: CurrentUser) {
    return this.eventsService.create(dto, actor)
  }

  @Get(':id')
  @Roles(...ALL_STAFF)
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id)
  }

  @Patch(':id')
  @Roles(...ADMIN_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateEventDto, @CurrentUserDec() actor: CurrentUser) {
    return this.eventsService.update(id, dto, actor)
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  remove(@Param('id') id: string, @CurrentUserDec() actor: CurrentUser) {
    return this.eventsService.remove(id, actor)
  }

  @Patch(':id/status')
  @Roles(...ADMIN_ROLES)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateEventStatusDto, @CurrentUserDec() actor: CurrentUser) {
    return this.eventsService.updateStatus(id, dto, actor)
  }

  // ── Event Report ──────────────────────────────────────────

  @Get(':id/report')
  @Roles(...ADMIN_ROLES)
  getReport(@Param('id') id: string) {
    return this.eventsService.getEventReport(id)
  }

  // ── Registrations ─────────────────────────────────────────

  @Get(':id/registrations')
  @Roles(...FINANCE_ROLES)
  listRegistrations(
    @Param('id') id: string,
    @Query('status') status?: EventRegistrationStatus,
    @Query('paymentStatus') paymentStatus?: EventRegistrationPaymentStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.eventsService.listRegistrations(id, {
      status, paymentStatus, search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Post(':id/registrations')
  @Roles(...ADMIN_ROLES)
  createRegistration(
    @Param('id') id: string,
    @Body() dto: CreateEventRegistrationDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.eventsService.createRegistration(id, dto, actor)
  }

  @Get(':id/registrations/:registrationId')
  @Roles(...FINANCE_ROLES)
  getRegistration(@Param('id') id: string, @Param('registrationId') registrationId: string) {
    return this.eventsService.getRegistration(id, registrationId)
  }

  @Patch(':id/registrations/:registrationId/status')
  @Roles(...ADMIN_ROLES)
  updateRegistrationStatus(
    @Param('id') id: string,
    @Param('registrationId') registrationId: string,
    @Body() dto: UpdateEventRegistrationStatusDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.eventsService.updateRegistrationStatus(id, registrationId, dto, actor)
  }

  @Post(':id/registrations/:registrationId/check-in')
  @Roles(...CHECKIN_ROLES)
  checkIn(
    @Param('id') id: string,
    @Param('registrationId') registrationId: string,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.eventsService.checkIn(id, registrationId, actor)
  }

  // ── Event Payments ────────────────────────────────────────

  @Get(':id/registrations/:registrationId/payments')
  @Roles(...FINANCE_ROLES)
  listPayments(@Param('id') id: string, @Param('registrationId') registrationId: string) {
    return this.eventsService.listPayments(id, registrationId)
  }

  @Post(':id/registrations/:registrationId/payments')
  @Roles(...FINANCE_ROLES)
  recordPayment(
    @Param('id') id: string,
    @Param('registrationId') registrationId: string,
    @Body() dto: RecordEventPaymentDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.eventsService.recordPayment(id, registrationId, dto, actor)
  }

  // ── Eligibility Rules ─────────────────────────────────────

  @Get(':id/eligibility-rules')
  @Roles(...ADMIN_ROLES)
  listEligibilityRules(@Param('id') id: string) {
    return this.eventsService.listEligibilityRules(id)
  }

  @Post(':id/eligibility-rules')
  @Roles(...ADMIN_ROLES)
  createEligibilityRule(
    @Param('id') id: string,
    @Body() dto: CreateEventEligibilityRuleDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.eventsService.createEligibilityRule(id, dto, actor)
  }

  @Delete(':id/eligibility-rules/:ruleId')
  @Roles(...ADMIN_ROLES)
  deleteEligibilityRule(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.eventsService.deleteEligibilityRule(id, ruleId, actor)
  }

  @Post(':id/check-eligibility')
  @Roles(...ADMIN_ROLES)
  checkEligibility(@Param('id') id: string, @Body() dto: CheckEligibilityDto) {
    return this.eventsService.checkEligibility(id, dto)
  }

  // ── Reminders ─────────────────────────────────────────────

  @Get(':id/reminders')
  @Roles(...ADMIN_ROLES)
  listReminders(@Param('id') id: string) {
    return this.eventsService.listReminders(id)
  }

  @Post(':id/reminders')
  @Roles(...ADMIN_ROLES)
  createReminder(
    @Param('id') id: string,
    @Body() dto: CreateEventReminderDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.eventsService.createReminder(id, dto, actor)
  }

  @Post(':id/send-announcement')
  @Roles(...ADMIN_ROLES)
  sendAnnouncement(
    @Param('id') id: string,
    @Body() dto: SendEventAnnouncementDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.eventsService.sendAnnouncement(id, dto, actor)
  }

  // ── Meetino integration sub-routes ────────────────────────────────────────

  /** POST /api/v1/events/:id/meetino — create or attach Meetino meeting for online/hybrid event */
  @Post(':id/meetino')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async attachMeetinoMeeting(
    @Param('id') id: string,
    @Body() dto: AttachMeetinoMeetingDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.meetinoIntegration.attachForEvent(id, dto, actor.id)
  }

  /** GET /api/v1/events/:id/meetino — get Meetino reference for event */
  @Get(':id/meetino')
  @Roles(...ALL_STAFF)
  async getMeetinoMeeting(@Param('id') id: string) {
    return this.meetinoIntegration.getForEvent(id)
  }

  /** POST /api/v1/events/:id/meetino/sync — sync attendance from Meetino */
  @Post(':id/meetino/sync')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  async syncMeetinoAttendance(
    @Param('id') id: string,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.meetinoIntegration.syncForEvent(id, actor.id)
  }

  /** GET /api/v1/events/:id/meetino/attendance — list attendance records */
  @Get(':id/meetino/attendance')
  @Roles(...ALL_STAFF)
  async getMeetinoAttendance(@Param('id') id: string) {
    const ref = await this.meetinoIntegration.getForEvent(id)
    if (!ref) return []
    return this.meetinoIntegration.getAttendanceRecords(ref.id)
  }
}
