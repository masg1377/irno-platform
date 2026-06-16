import {
  Controller, Get, Post, Patch,
  Param, Body, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { RecordTransactionDto } from './dto/record-transaction.dto'
import { CreateInstallmentsDto } from './dto/create-installments.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import { UserRole, PaymentStatus, InstallmentStatus } from '@irno/types'
import type { CurrentUser } from '@irno/types'

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async findAll(
    @Query('status') status?: string,
    @Query('studentId') studentId?: string,
    @Query('overdue') overdue?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.findAll({
      status: status as PaymentStatus | undefined,
      studentId,
      overdue: overdue === 'true',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
    })
  }

  @Get('finance-summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getFinanceSummary() {
    return this.paymentsService.getFinanceSummary()
  }

  @Get('installments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async listInstallments(
    @Query('status') status?: string,
    @Query('studentId') studentId?: string,
    @Query('overdue') overdue?: string,
    @Query('dueFrom') dueFrom?: string,
    @Query('dueTo') dueTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.listInstallments({
      status: status as InstallmentStatus | undefined,
      studentId,
      overdue: overdue === 'true',
      dueFrom,
      dueTo,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
    })
  }

  @Patch('installments/:id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async updateInstallmentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: InstallmentStatus,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.paymentsService.updateInstallmentStatus(id, status, actor)
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id)
  }

  @Post(':id/transactions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  async recordTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordTransactionDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.paymentsService.recordTransaction(id, dto, actor)
  }

  @Get(':id/transactions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getTransactions(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getTransactions(id)
  }

  @Post(':id/installments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  async createInstallments(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInstallmentsDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.paymentsService.createInstallments(id, dto, actor)
  }

  @Get(':id/installments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getInstallments(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getInstallments(id)
  }
}
