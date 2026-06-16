import type { Metadata } from 'next'
import Link from 'next/link'
import type { PublicCertificateVerificationDto } from '@irno/types'
import { fa } from '@irno/i18n'

export const metadata: Metadata = {
  title: 'اعتبارسنجی مدرک ایرنو',
}

interface PageProps {
  params: Promise<{ code: string }>
}

async function verifyCode(code: string): Promise<PublicCertificateVerificationDto | null> {
  try {
    const res = await fetch(
      `${process.env['HUB_API_URL'] ?? 'http://localhost:4000'}/api/v1/certificates/verify/${encodeURIComponent(code)}`,
      { cache: 'no-store' },
    )
    if (!res.ok) return null
    const raw = (await res.json()) as { data?: PublicCertificateVerificationDto }
    return raw.data ?? null
  } catch {
    return null
  }
}

export default async function VerifyCertificatePage({ params }: PageProps) {
  const { code } = await params
  const result = await verifyCode(code)

  if (!result) {
    return (
      <VerifyLayout>
        <InvalidBadge message="خطا در دریافت اطلاعات. لطفاً دوباره تلاش کنید." />
      </VerifyLayout>
    )
  }

  if (!result.isValid) {
    const isRevoked = result.status === 'REVOKED'
    return (
      <VerifyLayout>
        {isRevoked ? (
          <RevokedBadge />
        ) : (
          <InvalidBadge message={result.message ?? 'این کد اعتبارسنجی معتبر نیست.'} />
        )}
      </VerifyLayout>
    )
  }

  if (result.status === 'EXPIRED') {
    return (
      <VerifyLayout>
        <ExpiredBadge />
        <CertificateDetails result={result} />
      </VerifyLayout>
    )
  }

  return (
    <VerifyLayout>
      <ValidBadge />
      <CertificateDetails result={result} />
    </VerifyLayout>
  )
}

function VerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[var(--color-bg)] px-4 py-12"
    >
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block mb-4">
            <span className="text-2xl font-bold text-[var(--color-brand-700)]">ایرنو</span>
          </Link>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            {fa.certificates.verify}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            آکادمی ایرنو — سامانه تأیید اعتبار مدارک
          </p>
        </div>

        {children}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-[var(--color-text-muted)]">
          <p>این صفحه توسط ایرنو ارائه می‌شود.</p>
          <p className="mt-1">برای اطلاعات بیشتر با آکادمی ایرنو تماس بگیرید.</p>
        </div>
      </div>
    </div>
  )
}

function ValidBadge() {
  return (
    <div className="mb-6 rounded-xl border-2 border-green-300 bg-green-50 px-6 py-5 text-center dark:border-green-700 dark:bg-green-900/20">
      <div className="mb-2 text-3xl">✅</div>
      <p className="text-base font-bold text-green-800 dark:text-green-300">
        این مدرک توسط ایرنو صادر شده است.
      </p>
      <p className="mt-1 text-sm text-green-700 dark:text-green-400">
        مدرک معتبر است.
      </p>
    </div>
  )
}

function ExpiredBadge() {
  return (
    <div className="mb-6 rounded-xl border-2 border-yellow-300 bg-yellow-50 px-6 py-5 text-center dark:border-yellow-700 dark:bg-yellow-900/20">
      <div className="mb-2 text-3xl">⚠️</div>
      <p className="text-base font-bold text-yellow-800 dark:text-yellow-300">
        این مدرک منقضی شده است.
      </p>
      <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
        مدرک در گذشته توسط ایرنو صادر شده، اما تاریخ آن منقضی شده است.
      </p>
    </div>
  )
}

function RevokedBadge() {
  return (
    <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 px-6 py-5 text-center dark:border-red-700 dark:bg-red-900/20">
      <div className="mb-2 text-3xl">✗</div>
      <p className="text-base font-bold text-red-800 dark:text-red-300">
        این مدرک لغو شده یا معتبر نیست.
      </p>
    </div>
  )
}

function InvalidBadge({ message }: { message: string }) {
  return (
    <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 px-6 py-5 text-center dark:border-red-700 dark:bg-red-900/20">
      <div className="mb-2 text-3xl">✗</div>
      <p className="text-base font-bold text-red-800 dark:text-red-300">
        {message}
      </p>
    </div>
  )
}

function CertificateDetails({ result }: { result: PublicCertificateVerificationDto }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6">
      <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
        اطلاعات مدرک
      </h2>
      <dl className="space-y-3 text-sm">
        {result.title && (
          <div className="flex justify-between gap-4 border-b border-[var(--color-border)] pb-3">
            <dt className="shrink-0 text-[var(--color-text-muted)]">عنوان</dt>
            <dd className="text-right font-medium text-[var(--color-text-primary)]">{result.title}</dd>
          </div>
        )}
        {result.studentDisplayName && (
          <div className="flex justify-between gap-4 border-b border-[var(--color-border)] pb-3">
            <dt className="shrink-0 text-[var(--color-text-muted)]">دارنده مدرک</dt>
            <dd className="text-right font-semibold text-[var(--color-text-primary)]">{result.studentDisplayName}</dd>
          </div>
        )}
        {result.certificateNumber && (
          <div className="flex justify-between gap-4 border-b border-[var(--color-border)] pb-3">
            <dt className="shrink-0 text-[var(--color-text-muted)]">{fa.certificates.certificateNumber}</dt>
            <dd className="font-mono text-[var(--color-text-primary)]" dir="ltr">{result.certificateNumber}</dd>
          </div>
        )}
        {result.type && (
          <div className="flex justify-between gap-4 border-b border-[var(--color-border)] pb-3">
            <dt className="shrink-0 text-[var(--color-text-muted)]">نوع</dt>
            <dd className="text-[var(--color-text-primary)]">
              {fa.certificateTemplateType[result.type as keyof typeof fa.certificateTemplateType] ?? result.type}
            </dd>
          </div>
        )}
        {result.issuedAt && (
          <div className="flex justify-between gap-4 border-b border-[var(--color-border)] pb-3">
            <dt className="shrink-0 text-[var(--color-text-muted)]">{fa.certificates.issuedAt}</dt>
            <dd className="text-[var(--color-text-primary)]">
              {new Date(result.issuedAt).toLocaleDateString('fa-IR')}
            </dd>
          </div>
        )}
        {result.expiresAt ? (
          <div className="flex justify-between gap-4 border-b border-[var(--color-border)] pb-3">
            <dt className="shrink-0 text-[var(--color-text-muted)]">{fa.certificates.expiresAt}</dt>
            <dd className="text-[var(--color-text-primary)]">
              {new Date(result.expiresAt).toLocaleDateString('fa-IR')}
            </dd>
          </div>
        ) : (
          <div className="flex justify-between gap-4 border-b border-[var(--color-border)] pb-3">
            <dt className="shrink-0 text-[var(--color-text-muted)]">{fa.certificates.expiresAt}</dt>
            <dd className="text-[var(--color-text-muted)]">{fa.certificates.noExpiry}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="shrink-0 text-[var(--color-text-muted)]">اعتبارسنجی توسط</dt>
          <dd className="font-medium text-[var(--color-brand-700)]">{result.verifiedBy}</dd>
        </div>
      </dl>
    </div>
  )
}
