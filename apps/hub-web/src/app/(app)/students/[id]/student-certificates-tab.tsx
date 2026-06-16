'use client'

import { useState, useCallback, useEffect } from 'react'
import { fa } from '@irno/i18n'
import { CertificateTemplateType, StudentCertificateSourceType } from '@irno/types'
import type { StudentCertificateDto, CertificateTemplateDto } from '@irno/types'

interface Props {
  studentId: string
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    EXPIRED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    REVOKED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {fa.studentCertificateStatus[status as keyof typeof fa.studentCertificateStatus] ?? status}
    </span>
  )
}

export function StudentCertificatesTab({ studentId }: Props) {
  const [certs, setCerts] = useState<StudentCertificateDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [revokeReason, setRevokeReason] = useState('')

  const fetchCerts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/students/${studentId}/certificates`, {
        credentials: 'include',
      })
      const raw = (await res.json()) as { data?: StudentCertificateDto[] | { data?: StudentCertificateDto[] } }
      if (!res.ok) { setError('خطا در دریافت مدارک'); setLoading(false); return }
      const payload = raw.data
      const list = Array.isArray(payload)
        ? payload
        : (payload as { data?: StudentCertificateDto[] })?.data ?? []
      setCerts(list)
    } catch {
      setError('خطا در اتصال به سرور')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => { void fetchCerts() }, [fetchCerts])

  async function handleRevoke(certId: string) {
    try {
      const res = await fetch(`/api/v1/students/${studentId}/certificates/${certId}/revoke`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revokeReason: revokeReason || undefined }),
      })
      if (res.ok) {
        setRevoking(null)
        setRevokeReason('')
        void fetchCerts()
      } else {
        const raw = (await res.json()) as { message?: string }
        setError(raw.message ?? 'خطا در لغو مدرک')
      }
    } catch {
      setError('خطا در اتصال به سرور')
    }
  }

  function copyVerifyLink(cert: StudentCertificateDto) {
    const url = `${window.location.origin}/verify/certificate/${cert.verificationCode}`
    void navigator.clipboard.writeText(url)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{fa.certificates.title}</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-[var(--color-brand-600)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)]"
        >
          {showForm ? 'انصراف' : `+ ${fa.certificates.issue}`}
        </button>
      </div>

      {/* Issue form */}
      {showForm && (
        <IssueCertificateForm
          studentId={studentId}
          onSuccess={() => { setShowForm(false); void fetchCerts() }}
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
      ) : certs.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">هیچ مدرکی صادر نشده است.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {certs.map((cert) => (
            <div
              key={cert.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{cert.title}</p>
                  <p className="text-xs font-mono text-[var(--color-text-muted)] mt-0.5" dir="ltr">
                    {cert.certificateNumber}
                  </p>
                </div>
                <StatusBadge status={cert.status} />
              </div>

              <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
                <span>
                  {fa.certificateTemplateType[cert.type as keyof typeof fa.certificateTemplateType] ?? cert.type}
                </span>
                <span>·</span>
                <span>{fa.certificates.issuedAt}: {new Date(cert.issuedAt).toLocaleDateString('fa-IR')}</span>
                {cert.expiresAt && (
                  <>
                    <span>·</span>
                    <span>{fa.certificates.expiresAt}: {new Date(cert.expiresAt).toLocaleDateString('fa-IR')}</span>
                  </>
                )}
                {cert.issuedByName && (
                  <>
                    <span>·</span>
                    <span>صادرکننده: {cert.issuedByName}</span>
                  </>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`/api/v1/students/${studentId}/certificates/${cert.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
                >
                  {fa.certificates.downloadPdf}
                </a>
                {cert.publicVerifyEnabled && (
                  <button
                    type="button"
                    onClick={() => copyVerifyLink(cert)}
                    className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
                  >
                    کپی لینک اعتبارسنجی
                  </button>
                )}
                {cert.status !== 'REVOKED' && (
                  <button
                    type="button"
                    onClick={() => setRevoking(cert.id)}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    {fa.certificates.revoke}
                  </button>
                )}
              </div>

              {/* Revoke confirmation */}
              {revoking === cert.id && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/10">
                  <p className="mb-2 text-xs font-medium text-red-700 dark:text-red-400">
                    آیا از لغو این مدرک اطمینان دارید؟
                  </p>
                  <input
                    type="text"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="دلیل لغو (اختیاری)"
                    className="mb-2 w-full rounded border border-red-200 bg-white px-3 py-1.5 text-xs text-[var(--color-text-primary)] dark:bg-red-900/20"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRevoke(cert.id)}
                      className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      تأیید لغو
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRevoking(null); setRevokeReason('') }}
                      className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function IssueCertificateForm({
  studentId,
  onSuccess,
}: {
  studentId: string
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [titleTouched, setTitleTouched] = useState(false)
  const [type, setType] = useState<string>(CertificateTemplateType.COURSE_COMPLETION)
  const [templateId, setTemplateId] = useState('')
  const [sourceType, setSourceType] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [publicVerifyEnabled, setPublicVerifyEnabled] = useState(true)
  const [templates, setTemplates] = useState<CertificateTemplateDto[]>([])

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch('/api/v1/certificate-templates?limit=100', { credentials: 'include' })
        const raw = (await res.json()) as { data?: { data?: CertificateTemplateDto[] } }
        const list = raw.data?.data ?? []
        setTemplates(list.filter((t) => t.isActive))
      } catch {
        // ignore
      }
    }
    void fetchTemplates()
  }, [])

  function handleTemplateChange(id: string) {
    setTemplateId(id)
    if (!id) return
    const tmpl = templates.find((t) => t.id === id)
    if (!tmpl) return
    // auto-fill title and type from template — unless user already edited them
    if (!titleTouched) setTitle(tmpl.title)
    setType(tmpl.type)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        title,
        type,
        publicVerifyEnabled,
      }
      if (templateId) body['templateId'] = templateId
      if (sourceType) body['sourceType'] = sourceType
      if (expiresAt) body['expiresAt'] = new Date(expiresAt).toISOString()

      const res = await fetch(`/api/v1/students/${studentId}/certificates`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const raw = (await res.json()) as { message?: string }
      if (!res.ok) {
        setError(raw.message ?? 'خطا در صدور مدرک')
        setLoading(false)
        return
      }
      onSuccess()
    } catch {
      setError('خطا در اتصال به سرور')
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{fa.certificates.issue}</h3>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Template first — auto-fills title + type */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-primary)]">
          قالب مدرک
        </label>
        <select
          value={templateId}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
        >
          <option value="">انتخاب قالب (اختیاری)</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} — {fa.certificateTemplateType[t.type as keyof typeof fa.certificateTemplateType]}
            </option>
          ))}
        </select>
        {templates.length === 0 && (
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            هنوز قالبی ایجاد نشده.{' '}
            <a href="/certificate-templates/new" target="_blank" className="text-[var(--color-brand-600)] hover:underline">
              ایجاد قالب
            </a>
          </p>
        )}
      </div>

      {/* Title — auto-filled from template, editable */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-primary)]">
          عنوان مدرک <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => { setTitle(e.target.value); setTitleTouched(true) }}
          placeholder="مثال: گواهی اتمام دوره React"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none"
        />
      </div>

      {/* Type — auto-filled from template, editable */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-primary)]">نوع مدرک</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
        >
          {Object.values(CertificateTemplateType).map((t) => (
            <option key={t} value={t}>
              {fa.certificateTemplateType[t as keyof typeof fa.certificateTemplateType]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-primary)]">نوع منبع (اختیاری)</label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
          >
            <option value="">بدون منبع</option>
            {Object.values(StudentCertificateSourceType).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-primary)]">{fa.certificates.expiresAt} (اختیاری)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="publicVerify"
          checked={publicVerifyEnabled}
          onChange={(e) => setPublicVerifyEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--color-border)]"
        />
        <label htmlFor="publicVerify" className="text-xs text-[var(--color-text-primary)]">
          {fa.certificates.publicVerify}
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-50"
      >
        {loading ? 'در حال صدور...' : 'صدور مدرک'}
      </button>
    </form>
  )
}
