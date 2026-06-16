import { Controller, Get } from '@nestjs/common'
import { ReportsService } from './reports.service'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@irno/types'

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('students/needs-follow-up')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getNeedsFollowUp() {
    return this.reportsService.getNeedsFollowUp()
  }

  @Get('finance/overdue-installments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  getOverdueInstallments() {
    return this.reportsService.getOverdueInstallments()
  }

  @Get('finance/balances')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  getFinanceBalances() {
    return this.reportsService.getFinanceBalances()
  }

  @Get('enrollments/summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getEnrollmentSummary() {
    return this.reportsService.getEnrollmentSummary()
  }

  @Get('crm/summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getCrmSummary() {
    return this.reportsService.getCrmSummary()
  }

  @Get('events/summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getEventsSummary() {
    return this.reportsService.getEventsSummary()
  }
}
