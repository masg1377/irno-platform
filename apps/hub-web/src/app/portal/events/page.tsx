import type { Metadata } from 'next'
import { getPortalEvents } from '@/lib/api'
import { fa } from '@irno/i18n'

export const metadata: Metadata = { title: 'رویدادهای من' }

const REG_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار تأیید',
  APPROVED: 'تأیید شده',
  WAITLISTED: 'لیست انتظار',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو شده',
  ATTENDED: 'حضور داشتم',
  NO_SHOW: 'غیبت',
}

const REG_STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  APPROVED: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  WAITLISTED: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  REJECTED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  ATTENDED: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  NO_SHOW: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

const DELIVERY_MODE_LABELS: Record<string, string> = {
  ONLINE: 'آنلاین',
  IN_PERSON: 'حضوری',
  HYBRID: 'ترکیبی',
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  WEBINAR: 'وبینار',
  CONFERENCE: 'کنفرانس',
  FREE_DISCUSSION: 'گفتگوی آزاد',
  WORKSHOP: 'کارگاه',
  GROUP_CONSULTATION: 'مشاوره گروهی',
  OPEN_SESSION: 'جلسه باز',
  CHALLENGE: 'چالش',
  OTHER: 'سایر',
}

export default async function PortalEventsPage() {
  const events = await getPortalEvents()

  return (
    <div dir="rtl" className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">
        {fa.portal.myEvents}
      </h1>

      {events.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
          <p className="text-[var(--color-text-muted)]">{fa.portal.noEvents}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-[var(--color-text-primary)]">{event.title}</h2>
                  {event.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                      {event.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
                    <span className="rounded-md bg-[var(--color-bg-subtle)] px-2 py-0.5">
                      {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                    </span>
                    <span className="rounded-md bg-[var(--color-bg-subtle)] px-2 py-0.5">
                      {DELIVERY_MODE_LABELS[event.deliveryMode] ?? event.deliveryMode}
                    </span>
                    <span>
                      {fa.portal.eventDate}:{' '}
                      {new Date(event.startAt).toLocaleDateString('fa-IR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {event.registrationStatus && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${REG_STATUS_COLOR[event.registrationStatus] ?? ''}`}>
                      {REG_STATUS_LABELS[event.registrationStatus] ?? event.registrationStatus}
                    </span>
                  )}
                  {event.meetinoJoinUrl && event.registrationStatus === 'APPROVED' && (
                    <a
                      href={event.meetinoJoinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-[var(--color-brand-600)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-brand-700)]"
                    >
                      {fa.portal.joinEvent}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
