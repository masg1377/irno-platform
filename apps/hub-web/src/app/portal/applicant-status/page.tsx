import type { Metadata } from 'next'
import { getPortalMe, getPortalApplicant } from '@/lib/api'
import { fa } from '@irno/i18n'
import { ApplicantStatus } from '@irno/types'

export const metadata: Metadata = { title: 'وضعیت درخواست' }

const STATUS_LABELS: Record<string, string> = {
  NEW_APPLICANT: 'ثبت‌شده',
  CONTACTED: 'تماس گرفته‌شده',
  CONSULTED: 'مشاوره‌شده',
  READY_TO_REGISTER: 'آماده ثبت‌نام',
  REGISTERED: 'ثبت‌نام‌شده',
  NEEDS_FOLLOW_UP: 'نیاز به پیگیری',
  NOT_INTERESTED: 'بدون تمایل',
  CANCELLED: 'لغوشده',
}

const STATUS_COLOR: Record<string, string> = {
  NEW_APPLICANT: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CONTACTED: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  CONSULTED: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  READY_TO_REGISTER: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  REGISTERED: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  NEEDS_FOLLOW_UP: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  NOT_INTERESTED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  CANCELLED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const STEPS: ApplicantStatus[] = [
  ApplicantStatus.NEW_APPLICANT,
  ApplicantStatus.CONTACTED,
  ApplicantStatus.CONSULTED,
  ApplicantStatus.READY_TO_REGISTER,
  ApplicantStatus.REGISTERED,
]

export default async function ApplicantStatusPage() {
  const [portalMe, applicant] = await Promise.all([
    getPortalMe(),
    getPortalApplicant(),
  ])

  if (!applicant) {
    return (
      <div dir="rtl" className="max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">
          {fa.portal.requestStatus}
        </h1>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
          <p className="text-[var(--color-text-muted)]">
            رکورد متقاضی برای این حساب یافت نشد.
          </p>
        </div>
      </div>
    )
  }

  const statusIndex = STEPS.indexOf(applicant.status)
  const isNegativeStatus = [ApplicantStatus.NOT_INTERESTED, ApplicantStatus.CANCELLED].includes(applicant.status)

  return (
    <div dir="rtl" className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">
        {fa.portal.requestStatus}
      </h1>

      {/* Status card */}
      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[var(--color-text-primary)]">وضعیت فعلی</h2>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLOR[applicant.status] ?? ''}`}>
            {STATUS_LABELS[applicant.status] ?? applicant.status}
          </span>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">{applicant.nextSteps}</p>

        {/* Progress steps */}
        {!isNegativeStatus && (
          <div className="mt-6">
            <div className="flex items-center gap-0">
              {STEPS.map((step, idx) => {
                const isPast = idx < statusIndex
                const isCurrent = idx === statusIndex
                const isFuture = idx > statusIndex
                return (
                  <div key={step} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-3 w-3 rounded-full border-2 ${
                          isCurrent
                            ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)]'
                            : isPast
                            ? 'border-[var(--color-brand-400)] bg-[var(--color-brand-400)]'
                            : 'border-[var(--color-border)] bg-[var(--color-bg)]'
                        }`}
                      />
                      <span className={`mt-1 text-center text-[10px] leading-tight ${isFuture ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-secondary)]'}`}>
                        {STATUS_LABELS[step]}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 ${idx < statusIndex ? 'bg-[var(--color-brand-400)]' : 'bg-[var(--color-border)]'}`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-muted)]">جزئیات</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="text-xs text-[var(--color-text-muted)]">{fa.portal.registrationDate}</span>
            <p className="mt-0.5 font-medium text-[var(--color-text-primary)]">
              {new Date(applicant.createdAt).toLocaleDateString('fa-IR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          {applicant.interestedTopic && (
            <div>
              <span className="text-xs text-[var(--color-text-muted)]">{fa.portal.interestedTopic}</span>
              <p className="mt-0.5 font-medium text-[var(--color-text-primary)]">
                {applicant.interestedTopic}
              </p>
            </div>
          )}
          {applicant.interestedCourseName && (
            <div>
              <span className="text-xs text-[var(--color-text-muted)]">{fa.portal.interestedCourse}</span>
              <p className="mt-0.5 font-medium text-[var(--color-text-primary)]">
                {applicant.interestedCourseName}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contact note */}
      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4 text-sm text-[var(--color-text-muted)]">
        در صورت نیاز به پیگیری بیشتر، از طریق اینستاگرام یا تلگرام ایرنو با ما در تماس باشید.
      </div>
    </div>
  )
}
