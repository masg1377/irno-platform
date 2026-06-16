import type { Metadata } from 'next'
import Link from 'next/link'
import { getMe, getReportEnrollmentSummary } from '@/lib/api'
import { fa } from '@irno/i18n'
import { UserRole } from '@irno/types'

export const metadata: Metadata = { title: 'خلاصه ثبت‌نام‌ها' }

const ALLOWED_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN]

export default async function EnrollmentSummaryReportPage() {
  const user = await getMe()
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-[var(--color-text-muted)]">{fa.reports.accessDenied}</p>
      </div>
    )
  }

  const data = await getReportEnrollmentSummary()

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/reports" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          {fa.reports.title}
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{fa.reports.enrollmentSummary}</h1>
      </div>

      {!data ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.reports.noData}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="مجموع ثبت‌نام‌ها" value={data.totalEnrollments} />
          <StatCard label="ثبت‌نام‌های این ماه" value={data.enrollmentsThisMonth} accent />
          <StatCard label="فعال" value={data.activeEnrollments} />
          <StatCard label="در انتظار تأیید" value={data.pendingEnrollments} />
          <StatCard label="تکمیل شده" value={data.completedEnrollments} />
          <StatCard label="لغو شده" value={data.cancelledEnrollments} />
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border ${accent ? 'border-[var(--color-brand-300)] dark:border-[var(--color-brand-700)]' : 'border-[var(--color-border)]'} bg-[var(--color-bg-elevated)] p-5`}>
      <div className="mb-2 text-xs text-[var(--color-text-muted)]">{label}</div>
      <div className={`text-2xl font-bold ${accent ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-primary)]'}`}>
        {value.toLocaleString('fa-IR')}
      </div>
    </div>
  )
}
