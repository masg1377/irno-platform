'use client'

import { useState, useEffect } from 'react'
import { fa } from '@irno/i18n'
import type { PortalCertificateDto } from '@irno/types'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    EXPIRED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    REVOKED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {fa.studentCertificateStatus[status as keyof typeof fa.studentCertificateStatus] ?? status}
    </span>
  )
}

export default function PortalCertificatesPage() {
  const [certs, setCerts] = useState<PortalCertificateDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCerts() {
      try {
        const res = await fetch('/api/v1/portal/certificates', { credentials: 'include' })
        const raw = (await res.json()) as { data?: PortalCertificateDto[] | { data?: PortalCertificateDto[] } }
        if (!res.ok) { setError('خطا در دریافت مدارک'); setLoading(false); return }
        const payload = raw.data
        const list = Array.isArray(payload)
          ? payload
          : (payload as { data?: PortalCertificateDto[] })?.data ?? []
        setCerts(list)
      } catch {
        setError('خطا در اتصال به سرور')
      } finally {
        setLoading(false)
      }
    }
    void fetchCerts()
  }, [])

  async function copyVerifyLink(cert: PortalCertificateDto) {
    const url = `${window.location.origin}/verify/certificate/${cert.verificationCode}`
    await navigator.clipboard.writeText(url)
    setCopied(cert.id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div dir="rtl" className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">
        {fa.certificates.myCertificates}
      </h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        مدارک صادرشده توسط آکادمی ایرنو برای شما
      </p>

      {loading && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && certs.length === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
          <div className="mb-3 text-4xl">🎓</div>
          <p className="text-sm text-[var(--color-text-muted)]">{fa.certificates.noCertificates}</p>
        </div>
      )}

      {!loading && certs.length > 0 && (
        <div className="space-y-4">
          {certs.map((cert) => (
            <div
              key={cert.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{cert.title}</h2>
                  <p className="mt-0.5 text-xs font-mono text-[var(--color-text-muted)]" dir="ltr">
                    {cert.certificateNumber}
                  </p>
                </div>
                <StatusBadge status={cert.status} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
                <span>
                  {fa.certificateTemplateType[cert.type as keyof typeof fa.certificateTemplateType] ?? cert.type}
                </span>
                <span>·</span>
                <span>{fa.certificates.issuedAt}: {new Date(cert.issuedAt).toLocaleDateString('fa-IR')}</span>
                {cert.expiresAt ? (
                  <>
                    <span>·</span>
                    <span>{fa.certificates.expiresAt}: {new Date(cert.expiresAt).toLocaleDateString('fa-IR')}</span>
                  </>
                ) : (
                  <>
                    <span>·</span>
                    <span>{fa.certificates.noExpiry}</span>
                  </>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`/api/v1/portal/certificates/${cert.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
                >
                  <span>📥</span>
                  {fa.certificates.downloadPdf}
                </a>
                {cert.publicVerifyEnabled && (
                  <button
                    type="button"
                    onClick={() => void copyVerifyLink(cert)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
                  >
                    <span>{copied === cert.id ? '✅' : '🔗'}</span>
                    {copied === cert.id ? 'کپی شد!' : fa.certificates.verificationLink}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
