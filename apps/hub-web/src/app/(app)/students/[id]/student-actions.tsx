'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fa } from '@irno/i18n'
import { StudentStatus } from '@irno/types'

export function StudentActions({
  studentId,
  currentStatus,
}: {
  studentId: string
  currentStatus: string
}) {
  return (
    <div className="space-y-4">
      <StudentStatusUpdater studentId={studentId} currentStatus={currentStatus} />
    </div>
  )
}

function StudentStatusUpdater({
  studentId,
  currentStatus,
}: {
  studentId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value
    if (newStatus === currentStatus) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/students/${studentId}`, {
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
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
        {fa.students.status}
      </h3>
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
        {Object.values(StudentStatus).map((s) => (
          <option key={s} value={s}>
            {fa.studentStatus[s as keyof typeof fa.studentStatus] ?? s}
          </option>
        ))}
      </select>
    </div>
  )
}

export function StudentTimelineAddNote({ studentId }: { studentId: string }) {
  const router = useRouter()
  const [noteText, setNoteText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!noteText.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/students/${studentId}/notes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteText }),
      })
      const json = (await res.json()) as { message?: string }
      if (!res.ok) {
        setError(json.message ?? fa.errors.generic)
        return
      }
      setNoteText('')
      router.refresh()
    } catch {
      setError(fa.errors.networkError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
        {fa.students.addNote}
      </h3>
      {error && (
        <p className="mb-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={3}
          placeholder={fa.students.noteContent}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
        />
        <button
          type="submit"
          disabled={loading || !noteText.trim()}
          className="w-full rounded-lg bg-[var(--color-brand-600)] py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-60"
        >
          {loading ? 'در حال ثبت...' : 'ثبت یادداشت'}
        </button>
      </form>
    </div>
  )
}
