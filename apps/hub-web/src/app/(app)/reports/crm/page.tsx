import type { Metadata } from 'next'
import Link from 'next/link'
import { getMe, getReportCrmSummary } from '@/lib/api'
import { fa } from '@irno/i18n'
import { UserRole } from '@irno/types'

export const metadata: Metadata = { title: 'خلاصه متقاضیان' }

const ALLOWED_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN]

export default async function CrmSummaryReportPage() {
  const user = await getMe()
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-[var(--color-text-muted)]">{fa.reports.accessDenied}</p>
      </div>
    )
  }

  const data = await getReportCrmSummary()

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/reports" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          {fa.reports.title}
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{fa.reports.crmSummary}</h1>
      </div>

      {!data ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.reports.noData}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="مجموع متقاضیان" value={data.totalApplicants.toLocaleString('fa-IR')} />
            <StatCard label="متقاضیان این ماه" value={data.newApplicantsThisMonth.toLocaleString('fa-IR')} accent />
            <StatCard label="تبدیل به دانشجو" value={data.convertedApplicants.toLocaleString('fa-IR')} />
            <StatCard
              label="نرخ تبدیل"
              value={`%${data.conversionRate.toLocaleString('fa-IR')}`}
            />
          </div>

          {/* By status */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">توزیع بر اساس وضعیت</h2>
            <div className="space-y-2">
              {Object.entries(data.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {fa.applicantStatus[status as keyof typeof fa.applicantStatus] ?? status}
                  </span>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {(count as number).toLocaleString('fa-IR')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* By source */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">توزیع بر اساس منبع</h2>
            <div className="space-y-2">
              {Object.entries(data.bySource).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {fa.applicantSource[source as keyof typeof fa.applicantSource] ?? source}
                  </span>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {(count as number).toLocaleString('fa-IR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border ${accent ? 'border-[var(--color-brand-300)] dark:border-[var(--color-brand-700)]' : 'border-[var(--color-border)]'} bg-[var(--color-bg-elevated)] p-5`}>
      <div className="mb-2 text-xs text-[var(--color-text-muted)]">{label}</div>
      <div className={`text-2xl font-bold ${accent ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-primary)]'}`}>
        {value}
      </div>
    </div>
  )
}
