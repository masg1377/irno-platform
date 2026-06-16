import type { Metadata } from 'next'
import Link from 'next/link'
import { getMe, getApplicants, getStudents, getCourses, getCourseGroups, getFinanceSummary, getReportFollowUps, getReportEventsSummary } from '@/lib/api'
import { fa } from '@irno/i18n'
import { UserRole } from '@irno/types'

export const metadata: Metadata = {
  title: 'داشبورد',
}

const FINANCE_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT]

export default async function DashboardPage() {
  const [user, applicants, students, courses, groups] = await Promise.allSettled([
    getMe(),
    getApplicants({ limit: 1 }),
    getStudents({ limit: 1 }),
    getCourses({ limit: 1 }),
    getCourseGroups({ limit: 1 }),
  ])

  const getVal = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === 'fulfilled' ? r.value : fallback

  const userData = getVal(user, null)
  const applicantsData = getVal(applicants, { data: [], total: 0, page: 1, limit: 1 })
  const studentsData = getVal(students, { data: [], total: 0, page: 1, limit: 1 })
  const coursesData = getVal(courses, { data: [], total: 0, page: 1, limit: 1 })
  const groupsData = getVal(groups, { data: [], total: 0, page: 1, limit: 1 })

  const canSeeFinance = userData ? FINANCE_ROLES.includes(userData.role) : false
  const isAdminRole = userData ? [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(userData.role) : false
  const [finance, followUps, eventsSummary] = await Promise.all([
    canSeeFinance ? getFinanceSummary() : Promise.resolve(null),
    isAdminRole ? getReportFollowUps() : Promise.resolve([]),
    isAdminRole ? getReportEventsSummary() : Promise.resolve(null),
  ])

  const displayName = userData?.profile
    ? `${userData.profile.firstName} ${userData.profile.lastName}`
    : userData?.mobile ?? ''

  const kpiCards = [
    { label: 'دانشجویان', value: studentsData.total, icon: '◉', href: '/students', sub: 'مجموع' },
    { label: 'متقاضیان', value: applicantsData.total, icon: '◎', href: '/applicants', sub: 'مجموع' },
    { label: 'دوره‌ها', value: coursesData.total, icon: '◫', href: '/courses', sub: 'مجموع' },
    { label: 'گروه‌های آموزشی', value: groupsData.total, icon: '◩', href: '/groups', sub: 'مجموع' },
  ]

  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {fa.dashboard.welcome}، {displayName}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          خلاصه وضعیت آکادمی ایرنو
        </p>
      </div>

      {/* KPI cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-muted)]">{card.label}</span>
              <span className="text-lg">{card.icon}</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {card.value.toLocaleString('fa-IR')}
            </div>
            <div className="mt-1 text-xs text-[var(--color-text-muted)]">{card.sub}</div>
          </Link>
        ))}
      </div>

      {/* Finance cards — only for SUPER_ADMIN, ADMIN, ACCOUNTANT */}
      {canSeeFinance && finance && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            خلاصه مالی
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FinanceCard
              label="مجموع درآمد ثبت‌شده"
              value={formatToman(finance.totalRecordedRevenueToman)}
              href="/payments"
              accent="green"
            />
            <FinanceCard
              label="مجموع مانده پرداخت"
              value={formatToman(finance.totalRemainingToman)}
              href="/payments"
              accent="orange"
            />
            <FinanceCard
              label="اقساط معوق"
              value={`${finance.overdueInstallmentsCount.toLocaleString('fa-IR')} قسط`}
              sub={formatToman(finance.overdueInstallmentsAmountToman)}
              href="/payments?overdue=true"
              accent="red"
            />
            <FinanceCard
              label="ثبت‌نام‌های فعال"
              value={finance.activeEnrollments.toLocaleString('fa-IR')}
              sub={`از مجموع ${finance.totalEnrollments.toLocaleString('fa-IR')}`}
              href="/enrollments"
              accent="blue"
            />
          </div>
        </div>
      )}

      {/* Events KPI cards — only for ADMIN / SUPER_ADMIN */}
      {isAdminRole && eventsSummary && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            رویدادها
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FinanceCard
              label="رویدادهای آینده"
              value={eventsSummary.upcomingEvents.toLocaleString('fa-IR')}
              sub={`از مجموع ${eventsSummary.totalEvents.toLocaleString('fa-IR')}`}
              href="/events"
              accent="blue"
            />
            <FinanceCard
              label="رویدادهای در حال برگزاری"
              value={eventsSummary.liveEvents.toLocaleString('fa-IR')}
              href="/events?status=LIVE"
              accent="green"
            />
            <FinanceCard
              label="ثبت‌نام‌های رویداد این ماه"
              value={eventsSummary.registrationsThisMonth.toLocaleString('fa-IR')}
              href="/events"
              accent="orange"
            />
            <FinanceCard
              label="درآمد رویدادها"
              value={formatToman(eventsSummary.eventRevenueToman)}
              href="/events"
              accent="green"
            />
          </div>
        </div>
      )}

      {/* Follow-ups alert — ADMIN / SUPER_ADMIN only */}
      {isAdminRole && followUps.length > 0 && (
        <div className="mb-8">
          <Link
            href="/reports/follow-ups"
            className="flex items-center gap-3 rounded-xl border-2 border-orange-200 bg-orange-50 p-4 hover:opacity-80 transition-opacity dark:border-orange-800 dark:bg-orange-900/20"
          >
            <span className="text-xl">🔔</span>
            <div>
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                {followUps.length.toLocaleString('fa-IR')} متقاضی نیاز به پیگیری دارند
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">مشاهده گزارش پیگیری‌ها ←</p>
            </div>
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickSection
          title="میانبرها"
          links={[
            { label: 'ثبت متقاضی جدید', href: '/applicants/new' },
            { label: 'ثبت‌نام جدید', href: '/enrollments/new' },
            { label: 'ایجاد دوره جدید', href: '/courses/new' },
            { label: 'ثبت دانشجوی جدید', href: '/students/new' },
            { label: 'ایجاد رویداد جدید', href: '/events/new' },
          ]}
        />
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">وضعیت فاز</h3>
          <ul className="space-y-2 text-sm">
            {['فاز ۱ — زیرساخت', 'فاز ۲ — احراز هویت و کاربران', 'فاز ۳ — CRM متقاضیان و دانشجویان', 'فاز ۴ — دوره‌ها و گروه‌های آموزشی', 'فاز ۵ — ثبت‌نام و پرداخت', 'فاز ۶ — تایم‌لاین و گزارش‌ها', 'فاز ۷ — اعلان‌ها', 'فاز ۸ — رویدادها'].map((label) => (
              <li key={label} className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <span>✓</span><span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function formatToman(amount: number): string {
  return `${amount.toLocaleString('fa-IR')} تومان`
}

function FinanceCard({
  label, value, sub, href, accent,
}: {
  label: string
  value: string
  sub?: string
  href: string
  accent: 'green' | 'orange' | 'red' | 'blue'
}) {
  const accentMap = {
    green: 'border-green-200 dark:border-green-800',
    orange: 'border-orange-200 dark:border-orange-800',
    red: 'border-red-200 dark:border-red-800',
    blue: 'border-blue-200 dark:border-blue-800',
  }
  return (
    <Link
      href={href}
      className={`rounded-xl border-2 ${accentMap[accent]} bg-[var(--color-bg-elevated)] p-5 hover:opacity-80 transition-opacity`}
    >
      <div className="mb-2 text-sm text-[var(--color-text-muted)]">{label}</div>
      <div className="text-xl font-bold text-[var(--color-text-primary)]">{value}</div>
      {sub && <div className="mt-1 text-xs text-[var(--color-text-muted)]">{sub}</div>}
    </Link>
  )
}

function QuickSection({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
      <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">{title}</h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>←</span>
              <span>{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
