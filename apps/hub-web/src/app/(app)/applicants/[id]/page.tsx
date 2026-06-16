import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getApplicant } from '@/lib/api'
import { fa } from '@irno/i18n'
import { ApplicantStatusBadge } from '../page'
import { ApplicantActions } from './applicant-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const applicant = await getApplicant(id)
  return { title: applicant?.fullName ?? 'متقاضی' }
}

export default async function ApplicantDetailPage({ params }: PageProps) {
  const { id } = await params
  const applicant = await getApplicant(id)

  if (!applicant) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/applicants" className="hover:text-[var(--color-text-primary)]">
          {fa.applicants.title}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{applicant.fullName}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{applicant.fullName}</h1>
            <ApplicantStatusBadge status={applicant.status} />
          </div>
          <p className="mt-1 font-mono text-sm text-[var(--color-text-muted)]" dir="ltr">
            {applicant.mobile}
          </p>
        </div>

        {applicant.convertedToStudentId ? (
          <Link
            href={`/students/${applicant.convertedToStudentId}`}
            className="shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
          >
            {fa.applicants.viewStudent} ←
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info card */}
        <div className="space-y-6 lg:col-span-2">
          <InfoCard title={fa.applicants.applicantDetail}>
            <InfoRow label={fa.applicants.email} value={applicant.email ?? '—'} dir="ltr" />
            <InfoRow label={fa.applicants.city} value={applicant.city ?? '—'} />
            <InfoRow
              label={fa.applicants.source}
              value={applicant.source ? (fa.applicantSource[applicant.source as keyof typeof fa.applicantSource] ?? applicant.source) : '—'}
            />
            <InfoRow label="دوره مورد علاقه" value={applicant.interestedCourseName ?? '—'} />
            <InfoRow label={fa.applicants.interestedTopic} value={applicant.interestedTopic ?? '—'} />
            <InfoRow
              label={fa.applicants.assignedTo}
              value={applicant.assignedToName ?? fa.applicants.unassigned}
            />
            {applicant.followUpDate && (
              <InfoRow label={fa.applicants.followUpDate} value={new Date(applicant.followUpDate).toLocaleDateString('fa-IR')} />
            )}
            {applicant.convertedAt && (
              <InfoRow label={fa.applicants.convertedAt} value={new Date(applicant.convertedAt).toLocaleDateString('fa-IR')} />
            )}
          </InfoCard>

          {applicant.consultationNotes && (
            <InfoCard title={fa.applicants.consultationNotes}>
              <p className="whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
                {applicant.consultationNotes}
              </p>
            </InfoCard>
          )}

          {/* Notes */}
          <InfoCard title={fa.applicants.notes}>
            {applicant.notes && applicant.notes.length > 0 ? (
              <ul className="space-y-3">
                {applicant.notes.map((note) => (
                  <li key={note.id} className="rounded-lg bg-[var(--color-bg)] p-3">
                    <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">
                      {note.content}
                    </p>
                    <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
                      {note.authorName ?? '—'} · {new Date(note.createdAt).toLocaleDateString('fa-IR')}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">{fa.applicants.noNotes}</p>
            )}
          </InfoCard>
        </div>

        {/* Actions sidebar */}
        <div className="space-y-4">
          <ApplicantActions applicant={applicant} />
        </div>
      </div>
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
      <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
      {children}
    </div>
  )
}

function InfoRow({
  label,
  value,
  dir,
}: {
  label: string
  value: string
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] py-2 last:border-0">
      <span className="shrink-0 text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className={`text-sm text-[var(--color-text-primary)]`} dir={dir}>
        {value}
      </span>
    </div>
  )
}
