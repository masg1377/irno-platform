import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getEnrollment } from '@/lib/api'
import { fa } from '@irno/i18n'
import { EnrollmentStatus } from '@irno/types'

interface Props { params: Promise<{ id: string }> }

const statusColors: Record<EnrollmentStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  PAUSED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  COMPLETED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] py-2.5 last:border-0">
      <span className="text-sm text-[var(--color-text-muted)] shrink-0">{label}</span>
      <span className="text-sm text-[var(--color-text-primary)] text-left">{value}</span>
    </div>
  )
}

export default async function EnrollmentDetailPage({ params }: Props) {
  const { id } = await params
  const enrollment = await getEnrollment(id)
  if (!enrollment) notFound()

  const formatToman = (n: number) => n.toLocaleString('fa-IR') + ' تومان'

  return (
    <div className="space-y-6" dir="rtl">
      {/* Breadcrumb */}
      <nav className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
        <Link href="/enrollments" className="hover:text-[var(--color-text-primary)]">{fa.enrollments.title}</Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{enrollment.studentName}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{fa.enrollments.enrollmentDetail}</h1>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColors[enrollment.status]}`}>
              {fa.enrollmentStatus[enrollment.status]}
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            <Link href={`/students/${enrollment.studentId}`} className="text-blue-600 hover:underline dark:text-blue-400">
              {enrollment.studentName}
            </Link>
            {' — '}{enrollment.studentCode}
          </p>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Enrollment info */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">اطلاعات ثبت‌نام</h2>
          <InfoRow label={fa.enrollments.course} value={enrollment.courseName} />
          <InfoRow label={fa.enrollments.group} value={enrollment.courseGroupName ?? '—'} />
          <InfoRow label={fa.enrollments.enrollmentDate} value={new Date(enrollment.enrollmentDate).toLocaleDateString('fa-IR')} />
          {enrollment.notes && <InfoRow label={fa.enrollments.notes} value={enrollment.notes} />}
        </div>

        {/* Financial info */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">اطلاعات مالی</h2>
          <InfoRow label={fa.enrollments.tuition} value={formatToman(enrollment.tuitionAmountToman)} />
          <InfoRow label={fa.enrollments.discount} value={enrollment.discountAmountToman > 0 ? formatToman(enrollment.discountAmountToman) : '—'} />
          <InfoRow label={fa.enrollments.finalAmount} value={formatToman(enrollment.finalAmountToman)} />
          {enrollment.paymentStatus && (
            <InfoRow label="وضعیت پرداخت" value={fa.paymentStatus[enrollment.paymentStatus as keyof typeof fa.paymentStatus] ?? enrollment.paymentStatus} />
          )}
          {enrollment.paidAmountToman !== undefined && (
            <InfoRow label={fa.payments.paidAmount} value={formatToman(enrollment.paidAmountToman)} />
          )}
          {enrollment.remainingAmountToman !== undefined && enrollment.remainingAmountToman > 0 && (
            <InfoRow label={fa.payments.remainingAmount} value={formatToman(enrollment.remainingAmountToman)} />
          )}
        </div>
      </div>

      {/* Link to payment */}
      {enrollment.paymentId && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">رکورد پرداخت</p>
            <p className="text-sm text-[var(--color-text-muted)]">مدیریت تراکنش‌ها و اقساط</p>
          </div>
          <Link
            href={`/payments/${enrollment.paymentId}`}
            className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)]"
          >
            مشاهده پرداخت
          </Link>
        </div>
      )}
    </div>
  )
}
