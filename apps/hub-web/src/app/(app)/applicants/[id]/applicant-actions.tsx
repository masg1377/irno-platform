'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fa } from '@irno/i18n'
import { ApplicantStatus } from '@irno/types'
import type { ApplicantDto } from '@irno/types'

export function ApplicantActions({ applicant }: { applicant: ApplicantDto }) {
  const router = useRouter()
  const [noteText, setNoteText] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [convertLoading, setConvertLoading] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteText.trim()) return
    setNoteLoading(true)
    setNoteError(null)
    try {
      const res = await fetch(`/api/v1/applicants/${applicant.id}/notes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteText }),
      })
      const json = (await res.json()) as { message?: string }
      if (!res.ok) {
        setNoteError(json.message ?? fa.errors.generic)
        return
      }
      setNoteText('')
      router.refresh()
    } catch {
      setNoteError(fa.errors.networkError)
    } finally {
      setNoteLoading(false)
    }
  }

  async function handleConvert() {
    if (!confirm(fa.applicants.convertConfirmText)) return
    setConvertLoading(true)
    setConvertError(null)
    try {
      const res = await fetch(`/api/v1/applicants/${applicant.id}/convert`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = (await res.json()) as { message?: string; data?: { id: string } }
      if (!res.ok) {
        setConvertError(json.message ?? fa.errors.generic)
        return
      }
      router.push(`/students/${json.data?.id ?? ''}`)
      router.refresh()
    } catch {
      setConvertError(fa.errors.networkError)
    } finally {
      setConvertLoading(false)
    }
  }

  return (
    <>
      {/* Add note */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
          {fa.applicants.addNote}
        </h3>
        {noteError && (
          <p className="mb-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {noteError}
          </p>
        )}
        <form onSubmit={handleAddNote} className="space-y-2">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            placeholder={fa.applicants.noteContent}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          />
          <button
            type="submit"
            disabled={noteLoading || !noteText.trim()}
            className="w-full rounded-lg bg-[var(--color-brand-600)] py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-60"
          >
            {noteLoading ? 'در حال ثبت...' : 'ثبت یادداشت'}
          </button>
        </form>
      </div>

      {/* Convert to student */}
      {applicant.convertedToStudentId ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.applicants.alreadyConverted}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">
            {fa.applicants.convertConfirmTitle}
          </h3>
          {convertError && (
            <p className="mb-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {convertError}
            </p>
          )}
          <button
            type="button"
            onClick={handleConvert}
            disabled={convertLoading}
            className="w-full rounded-lg border border-[var(--color-brand-500)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-600)] transition-colors hover:bg-[var(--color-brand-50)] disabled:opacity-60 dark:hover:bg-[var(--color-brand-900)]/20"
          >
            {convertLoading ? 'در حال تبدیل...' : fa.applicants.convertToStudent}
          </button>
        </div>
      )}

      {/* Change status quick action */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
          تغییر وضعیت
        </h3>
        <StatusUpdater applicantId={applicant.id} currentStatus={applicant.status} />
      </div>
    </>
  )
}

function StatusUpdater({ applicantId, currentStatus }: { applicantId: string; currentStatus: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value
    if (newStatus === currentStatus) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/applicants/${applicantId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = (await res.json()) as { message?: string }
      if (!res.ok) {
        setError(json.message ?? fa.errors.generic)
        return
      }
      router.refresh()
    } catch {
      setError(fa.errors.networkError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {error && (
        <p className="mb-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      )}
      <select
        defaultValue={currentStatus}
        onChange={handleChange}
        disabled={loading}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none disabled:opacity-60"
      >
        {Object.values(ApplicantStatus).map((s) => (
          <option key={s} value={s}>
            {fa.applicantStatus[s as keyof typeof fa.applicantStatus] ?? s}
          </option>
        ))}
      </select>
    </>
  )
}
