import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AppConfigModule } from './config/config.module'
import { PrismaModule } from './prisma/prisma.module'
import { RedisModule } from './redis/redis.module'
import { HealthModule } from './health/health.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { AppsModule } from './apps/apps.module'
import { ApplicantsModule } from './applicants/applicants.module'
import { StudentsModule } from './students/students.module'
import { CoursesModule } from './courses/courses.module'
import { CourseGroupsModule } from './course-groups/course-groups.module'
import { EnrollmentsModule } from './enrollments/enrollments.module'
import { PaymentsModule } from './payments/payments.module'
import { ReportsModule } from './reports/reports.module'
import { NotificationsModule } from './notifications/notifications.module'
import { EventsModule } from './events/events.module'
import { MeetinoIntegrationModule } from './meetino-integration/meetino-integration.module'
import { PortalModule } from './portal/portal.module'
import { SkillsModule } from './skills/skills.module'
import { CreditsModule } from './credits/credits.module'
import { StudentSkillsModule } from './student-skills/student-skills.module'
import { EligibilityModule } from './eligibility/eligibility.module'
import { TaxonomyModule } from './taxonomy/taxonomy.module'
import { LookupModule } from './lookup/lookup.module'
import { CertificatesModule } from './certificates/certificates.module'
import { CareerModule } from './career/career.module'
import { SecurityModule } from './security/security.module'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { RolesGuard } from './auth/guards/roles.guard'
import { JwtModule } from '@nestjs/jwt'

@Module({
  imports: [
    // Config must be first — other modules depend on it
    AppConfigModule,
    PrismaModule,
    RedisModule,
    HealthModule,
    // JwtModule registered globally so JwtAuthGuard can inject JwtService
    JwtModule.register({}),
    AuthModule,
    UsersModule,
    AppsModule,
    ApplicantsModule,
    StudentsModule,
    CoursesModule,
    CourseGroupsModule,
    EnrollmentsModule,
    PaymentsModule,
    ReportsModule,
    NotificationsModule,
    EventsModule,
    MeetinoIntegrationModule,
    PortalModule,
    SkillsModule,
    CreditsModule,
    StudentSkillsModule,
    EligibilityModule,
    TaxonomyModule,
    LookupModule,
    CertificatesModule,
    CareerModule,
    // SecurityModule must be last — it registers RateLimitGuard as APP_GUARD
    // which must run AFTER JwtAuthGuard (so user.userId is resolved first)
    SecurityModule,
  ],
  providers: [
    // Guard order: JwtAuthGuard → RolesGuard → RateLimitGuard
    // NestJS APP_GUARD providers are applied in registration order.
    // JwtAuthGuard and RolesGuard registered here; RateLimitGuard registered in SecurityModule.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
