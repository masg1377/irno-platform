import type { Metadata } from 'next'
import Link from 'next/link'
import { getMe, getReportFinanceBalances } from '@/lib/api'
import { fa } from '@irno/i18n'
import { UserRole } from '@irno/types'

export const metadata: Metadata = { title: 'مانده پرداخت' }

const ALLOWED_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT]

function formatToman(n: number) {
  return `${n.toLocaleString('fa-IR')} تومان`
}

export default async function FinanceBalancesReportPage() {
  const user = await getMe()
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-[var(--color-text-muted)]">{fa.reports.accessDenied}</p>
      </div>
    )
  }

  const data = await getReportFinanceBalances()

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/reports" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          {fa.reports.title}
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{fa.reports.financeBalances}</h1>
      </div>

      {!data ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.reports.noData}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard label="مجموع مبلغ قراردادها" value={formatToman(data.totalAmountToman)} accent="blue" />
          <SummaryCard label="مجموع پرداخت‌شده" value={formatToman(data.totalPaidToman)} accent="green" />
          <SummaryCard label="مجموع مانده" value={formatToman(data.totalRemainingToman)} accent="orange" />
          <SummaryCard label="پرداخت نشده" value={`${data.unpaidCount.toLocaleString('fa-IR')} رکورد`} accent="red" />
          <SummaryCard label="پرداخت ناقص" value={`${data.partiallyPaidCount.toLocaleString('fa-IR')} رکورد`} accent="orange" />
          <SummaryCard
            label="اقساط معوق"
            value={`${data.overdueInstallmentsCount.toLocaleString('fa-IR')} قسط`}
            sub={formatToman(data.overdueInstallmentsAmountToman)}
            accent="red"
          />
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent: 'green' | 'orange' | 'red' | 'blue'
}) {
  const borderMap = {
    green: 'border-green-200 dark:border-green-800',
    orange: 'border-orange-200 dark:border-orange-800',
    red: 'border-red-200 dark:border-red-800',
    blue: 'border-blue-200 dark:border-blue-800',
  }
  return (
    <div className={`rounded-xl border-2 ${borderMap[accent]} bg-[var(--color-bg-elevated)] p-5`}>
      <div className="mb-2 text-xs text-[var(--color-text-muted)]">{label}</div>
      <div className="text-lg font-bold text-[var(--color-text-primary)]">{value}</div>
      {sub && <div className="mt-1 text-xs text-[var(--color-text-muted)]">{sub}</div>}
    </div>
  )
}
