import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { StudentCreditStatus } from '@irno/types'
import type { EligibilityCheckResult } from '@irno/types'

export interface EligibilityRule {
  type: string
  value?: string
}

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'TEACHER', 'MENTOR']

/**
 * EligibilityService — shared service that evaluates eligibility rules
 * for a given student against a set of rules.
 *
 * Used by EventsModule (and future modules) to check whether a student
 * meets the requirements for registration, access, or progression.
 */
@Injectable()
export class EligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as any
  }

  /**
   * Evaluate all provided rules against the given student.
   *
   * @param studentId  - Hub student UUID (from students table)
   * @param rules      - Array of eligibility rules to evaluate
   * @returns EligibilityCheckResult — { eligible, failedRules, message }
   */
  async checkStudentEligibility(
    studentId: string,
    rules: EligibilityRule[],
  ): Promise<EligibilityCheckResult> {
    if (rules.length === 0) {
      return { eligible: true, failedRules: [], message: null }
    }

    const failedRules: string[] = []

    for (const rule of rules) {
      const passed = await this.evaluateRule(studentId, rule)
      if (!passed) {
        failedRules.push(rule.type)
      }
    }

    const eligible = failedRules.length === 0

    let message: string | null = null
    if (!eligible) {
      message = this.buildFailureMessage(failedRules)
    }

    return { eligible, failedRules, message }
  }

  // ─── Rule evaluators ───────────────────────────────────────────────────────

  private async evaluateRule(studentId: string, rule: EligibilityRule): Promise<boolean> {
    switch (rule.type) {
      case 'PUBLIC':
        return true

      case 'STAFF_ONLY':
        // Staff-only rules must be enforced by route guards, not here.
        // From eligibility perspective: fails for students.
        return false

      case 'MANUAL_APPROVAL_REQUIRED':
        // Cannot be automatically approved — always fails here.
        return false

      case 'SKILL_OR_CREDIT_PLACEHOLDER':
        // Legacy placeholder — treated same as manual approval.
        return false

      case 'ACTIVE_STUDENT_ONLY':
        return this.checkActiveStudent(studentId)

      case 'NO_OVERDUE_PAYMENTS':
        return this.checkNoOverduePayments(studentId)

      case 'REQUIRED_SKILL':
        return this.checkRequiredSkill(studentId, rule.value)

      case 'REQUIRED_CREDIT':
        return this.checkRequiredCredit(studentId, rule.value)

      case 'SPECIFIC_COURSE':
        return this.checkSpecificCourse(studentId, rule.value)

      case 'SPECIFIC_COURSE_GROUP':
        return this.checkSpecificCourseGroup(studentId, rule.value)

      case 'COMPLETED_COURSE':
        return this.checkCompletedCourse(studentId, rule.value)

      default:
        // Unknown rule type — fail safe (deny).
        return false
    }
  }

  private async checkActiveStudent(studentId: string): Promise<boolean> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, status: 'ACTIVE', deletedAt: null },
    })
    return student !== null
  }

  private async checkNoOverduePayments(studentId: string): Promise<boolean> {
    // Find all payment IDs for the student, then check for overdue installments
    const payments = await this.prisma.payment.findMany({
      where: { studentId },
      select: { id: true },
    })
    if (payments.length === 0) return true

    const paymentIds = payments.map((p: { id: string }) => p.id)
    const now = new Date()

    const overdueInstallment = await this.prisma.installment.findFirst({
      where: {
        paymentId: { in: paymentIds },
        status: 'PENDING',
        dueDate: { lt: now },
      },
    })

    return overdueInstallment === null
  }

  private async checkRequiredSkill(
    studentId: string,
    skillId: string | undefined,
  ): Promise<boolean> {
    if (!skillId) return false

    const studentSkill = await this.db.studentSkill.findFirst({
      where: { studentId, skillId },
    })

    return studentSkill !== null
  }

  private async checkRequiredCredit(
    studentId: string,
    creditId: string | undefined,
  ): Promise<boolean> {
    if (!creditId) return false

    const now = new Date()

    const studentCredit = await this.db.studentCredit.findFirst({
      where: {
        studentId,
        creditId,
        status: StudentCreditStatus.ACTIVE,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
    })

    return studentCredit !== null
  }

  private async checkSpecificCourse(
    studentId: string,
    courseId: string | undefined,
  ): Promise<boolean> {
    if (!courseId) return false

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        courseId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        deletedAt: null,
      },
    })

    return enrollment !== null
  }

  private async checkSpecificCourseGroup(
    studentId: string,
    courseGroupId: string | undefined,
  ): Promise<boolean> {
    if (!courseGroupId) return false

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        courseGroupId,
        deletedAt: null,
      },
    })

    return enrollment !== null
  }

  private async checkCompletedCourse(
    studentId: string,
    courseId: string | undefined,
  ): Promise<boolean> {
    if (!courseId) return false

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        courseId,
        status: 'COMPLETED',
        deletedAt: null,
      },
    })

    return enrollment !== null
  }

  // ─── Message builder ───────────────────────────────────────────────────────

  private buildFailureMessage(failedRules: string[]): string {
    const messages: Record<string, string> = {
      PUBLIC: '',
      STAFF_ONLY: 'فقط کارکنان ایرنو می‌توانند ثبت‌نام کنند',
      MANUAL_APPROVAL_REQUIRED: 'ثبت‌نام نیاز به تأیید دستی دارد',
      SKILL_OR_CREDIT_PLACEHOLDER: 'ثبت‌نام نیاز به تأیید دستی دارد',
      ACTIVE_STUDENT_ONLY: 'باید دانشجوی فعال ایرنو باشید',
      NO_OVERDUE_PAYMENTS: 'اقساط معوق پرداخت‌نشده دارید',
      REQUIRED_SKILL: 'مهارت لازم برای ثبت‌نام را ندارید',
      REQUIRED_CREDIT: 'اعتبار لازم برای ثبت‌نام را ندارید',
      SPECIFIC_COURSE: 'ثبت‌نام در دوره مشخصی الزامی است',
      SPECIFIC_COURSE_GROUP: 'عضویت در گروه آموزشی مشخصی الزامی است',
      COMPLETED_COURSE: 'باید دوره پیش‌نیاز را با موفقیت گذرانده باشید',
    }

    const reasons = failedRules
      .map((r) => messages[r])
      .filter(Boolean)

    if (reasons.length === 0) return 'شرایط لازم برای ثبت‌نام را ندارید'
    if (reasons.length === 1) return reasons[0]
    return `شرایط لازم برای ثبت‌نام را ندارید: ${reasons.join('؛ ')}`
  }
}
