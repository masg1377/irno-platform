'use client'

import { useState, useCallback } from 'react'
import { useEffect } from 'react'
import { fa } from '@irno/i18n'
import { StudentSkillLevel } from '@irno/types'
import type { StudentSkillDto } from '@irno/types'
import { AsyncSelect } from '@/components/ui/AsyncSelect'

interface Props {
  studentId: string
}

export function StudentSkillsTab({ studentId }: Props) {
  const [skills, setSkills] = useState<StudentSkillDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const fetchSkills = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/students/${studentId}/skills`, {
        credentials: 'include',
      })
      const raw = (await res.json()) as { data?: { data?: StudentSkillDto[] } | StudentSkillDto[] }
      if (!res.ok) { setError('خطا در دریافت مهارت‌ها'); setLoading(false); return }
      // paginated: raw.data.data, or array: raw.data
      const list = (raw.data as { data?: StudentSkillDto[] })?.data ?? (raw.data as StudentSkillDto[]) ?? []
      setSkills(list)
    } catch {
      setError('خطا در اتصال به سرور')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => { void fetchSkills() }, [fetchSkills])

  async function handleDelete(studentSkillId: string) {
    if (!confirm('آیا می‌خواهید این مهارت را حذف کنید؟')) return
    try {
      const res = await fetch(`/api/v1/students/${studentId}/skills/${studentSkillId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) void fetchSkills()
      else setError('خطا در حذف مهارت')
    } catch {
      setError('خطا در اتصال به سرور')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{fa.skills.studentSkills}</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-[var(--color-brand-600)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)]"
        >
          {showForm ? 'انصراف' : `+ ${fa.skills.awardSkill}`}
        </button>
      </div>

      {/* Award form */}
      {showForm && (
        <AwardSkillForm
          studentId={studentId}
          onSuccess={() => { setShowForm(false); void fetchSkills() }}
        />
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>
        </div>
      ) : skills.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.skills.noStudentSkills}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                {['عنوان مهارت', 'دسته‌بندی', 'سطح مهارت کاتالوگ', 'سطح دانشجو', 'اعطاشده توسط', 'تاریخ اعطا', ''].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {skills.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-[var(--color-bg-subtle)]">
                  <td className="px-3 py-2.5 font-medium text-[var(--color-text-primary)]">{s.skillTitle}</td>
                  <td className="px-3 py-2.5 text-[var(--color-text-secondary)]">{s.skillCategory ?? '—'}</td>
                  <td className="px-3 py-2.5 text-[var(--color-text-secondary)]">
                    {fa.skillLevel[s.skillLevel as keyof typeof fa.skillLevel] ?? s.skillLevel}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-[var(--color-brand-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)]/40 dark:text-[var(--color-brand-300)]">
                      {fa.studentSkillLevel[s.level as keyof typeof fa.studentSkillLevel] ?? s.level}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[var(--color-text-muted)]">{s.awardedByName}</td>
                  <td className="px-3 py-2.5 text-[var(--color-text-muted)]">
                    {new Date(s.awardedAt).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="px-3 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      className="rounded px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AwardSkillForm({ studentId, onSuccess }: { studentId: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skillId, setSkillId] = useState('')
  const [level, setLevel] = useState<string>(StudentSkillLevel.BASIC)
  const [evidenceNote, setEvidenceNote] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!skillId) { setError('لطفاً یک مهارت انتخاب کنید'); return }
    setError(null)
    setLoading(true)
    const body = {
      skillId,
      level,
      evidenceNote: evidenceNote || undefined,
    }
    try {
      const res = await fetch(`/api/v1/students/${studentId}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as { error?: { message: string[] | string } }
      if (!res.ok) {
        const msg = json.error?.message
        setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'خطا در اعطای مهارت'))
        setLoading(false)
        return
      }
      onSuccess()
    } catch {
      setError('خطا در اتصال به سرور')
      setLoading(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none'
  const labelCls = 'mb-1 block text-xs font-medium text-[var(--color-text-secondary)]'

  return (
    <div className="rounded-xl border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] p-4 dark:border-[var(--color-brand-800)] dark:bg-[var(--color-brand-900)]/10">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">{fa.skills.awardSkill}</h3>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelCls}>
            مهارت <span className="text-red-500">*</span>
          </label>
          <AsyncSelect
            endpoint="/api/v1/lookup/skills"
            value={skillId}
            onChange={(id) => setSkillId(id)}
            placeholder={fa.lookup.selectSkill}
          />
        </div>

        <div>
          <label className={labelCls}>
            {fa.skills.studentLevel} <span className="text-red-500">*</span>
          </label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            required
            className={inputCls}
          >
            {Object.values(StudentSkillLevel).map((l) => (
              <option key={l} value={l}>
                {fa.studentSkillLevel[l as keyof typeof fa.studentSkillLevel]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>{fa.skills.evidenceNote}</label>
          <textarea
            value={evidenceNote}
            onChange={(e) => setEvidenceNote(e.target.value)}
            rows={2}
            className={inputCls}
            placeholder="مدرک یا توضیح داخلی (اختیاری)..."
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-60"
          >
            {loading ? 'در حال ثبت...' : fa.skills.awardSkill}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Student Credits Tab ────────────────────────────────────────────────────────

import type { StudentCreditDto } from '@irno/types'
import { StudentCreditStatus, CreditType } from '@irno/types'

interface CreditsTabProps {
  studentId: string
}

export function StudentCreditsTab({ studentId }: CreditsTabProps) {
  const [credits, setCredits] = useState<StudentCreditDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const fetchCredits = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/students/${studentId}/credits`, {
        credentials: 'include',
      })
      const raw = (await res.json()) as { data?: { data?: StudentCreditDto[] } | StudentCreditDto[] }
      if (!res.ok) { setError('خطا در دریافت اعتبارها'); setLoading(false); return }
      const list = (raw.data as { data?: StudentCreditDto[] })?.data ?? (raw.data as StudentCreditDto[]) ?? []
      setCredits(list)
    } catch {
      setError('خطا در اتصال به سرور')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => { void fetchCredits() }, [fetchCredits])

  async function handleRevoke(creditRecordId: string) {
    if (!confirm('آیا می‌خواهید این اعتبار را لغو کنید؟')) return
    try {
      const res = await fetch(`/api/v1/students/${studentId}/credits/${creditRecordId}/revoke`, {
        method: 'PATCH',
        credentials: 'include',
      })
      if (res.ok) void fetchCredits()
      else setError('خطا در لغو اعتبار')
    } catch {
      setError('خطا در اتصال به سرور')
    }
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      EXPIRED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      REVOKED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    }
    return (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
        {fa.studentCreditStatus[status as keyof typeof fa.studentCreditStatus] ?? status}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{fa.credits.studentCredits}</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-[var(--color-brand-600)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)]"
        >
          {showForm ? 'انصراف' : `+ ${fa.credits.awardCredit}`}
        </button>
      </div>

      {showForm && (
        <AwardCreditForm
          studentId={studentId}
          onSuccess={() => { setShowForm(false); void fetchCredits() }}
        />
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>
        </div>
      ) : credits.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.credits.noStudentCredits}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                {['عنوان اعتبار', 'نوع', 'وضعیت', 'تاریخ اعطا', 'تاریخ انقضا', ''].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {credits.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-[var(--color-bg-subtle)]">
                  <td className="px-3 py-2.5 font-medium text-[var(--color-text-primary)]">{c.creditTitle}</td>
                  <td className="px-3 py-2.5 text-[var(--color-text-secondary)]">
                    {fa.creditType[c.creditType as keyof typeof fa.creditType] ?? c.creditType}
                  </td>
                  <td className="px-3 py-2.5">{statusBadge(c.status)}</td>
                  <td className="px-3 py-2.5 text-[var(--color-text-muted)]">
                    {new Date(c.awardedAt).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--color-text-muted)]">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('fa-IR') : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-left">
                    {c.status === StudentCreditStatus.ACTIVE && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(c.id)}
                        className="rounded px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        لغو
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AwardCreditForm({ studentId, onSuccess }: { studentId: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creditId, setCreditId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [evidenceNote, setEvidenceNote] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!creditId) { setError('لطفاً یک اعتبار انتخاب کنید'); return }
    setError(null)
    setLoading(true)
    const body = {
      creditId,
      evidenceNote: evidenceNote || undefined,
      expiresAt: expiresAt || undefined,
    }
    try {
      const res = await fetch(`/api/v1/students/${studentId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as { error?: { message: string[] | string } }
      if (!res.ok) {
        const msg = json.error?.message
        setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'خطا در اعطای اعتبار'))
        setLoading(false)
        return
      }
      onSuccess()
    } catch {
      setError('خطا در اتصال به سرور')
      setLoading(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none'
  const labelCls = 'mb-1 block text-xs font-medium text-[var(--color-text-secondary)]'

  return (
    <div className="rounded-xl border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] p-4 dark:border-[var(--color-brand-800)] dark:bg-[var(--color-brand-900)]/10">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">{fa.credits.awardCredit}</h3>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelCls}>
            اعتبار <span className="text-red-500">*</span>
          </label>
          <AsyncSelect
            endpoint="/api/v1/lookup/credits"
            value={creditId}
            onChange={(id) => setCreditId(id)}
            placeholder={fa.lookup.selectCredit}
          />
        </div>

        <div>
          <label className={labelCls}>{fa.credits.expiresAt} (اختیاری)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={inputCls}
            dir="ltr"
          />
        </div>

        <div>
          <label className={labelCls}>{fa.credits.evidenceNote}</label>
          <textarea
            value={evidenceNote}
            onChange={(e) => setEvidenceNote(e.target.value)}
            rows={2}
            className={inputCls}
            placeholder="مدرک یا توضیح داخلی (اختیاری)..."
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-60"
          >
            {loading ? 'در حال ثبت...' : fa.credits.awardCredit}
          </button>
        </div>
      </form>
    </div>
  )
}
