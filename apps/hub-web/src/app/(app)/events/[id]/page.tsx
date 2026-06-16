import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEvent, getEventRegistrations, getEventEligibilityRules, getEventReminders, getEventReport } from '@/lib/api'
import { EventDetailClient } from './EventDetailClient'

export const metadata: Metadata = { title: 'جزئیات رویداد' }

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [event, registrations, eligibilityRules, reminders, report] = await Promise.allSettled([
    getEvent(id),
    getEventRegistrations(id, { limit: 50 }),
    getEventEligibilityRules(id),
    getEventReminders(id),
    getEventReport(id),
  ])

  const ev = event.status === 'fulfilled' ? event.value : null
  if (!ev) notFound()

  return (
    <EventDetailClient
      event={ev}
      initialRegistrations={registrations.status === 'fulfilled' ? registrations.value : { data: [], total: 0, page: 1, limit: 50 }}
      initialEligibilityRules={eligibilityRules.status === 'fulfilled' ? eligibilityRules.value : []}
      initialReminders={reminders.status === 'fulfilled' ? reminders.value : []}
      initialReport={report.status === 'fulfilled' ? report.value : null}
    />
  )
}
