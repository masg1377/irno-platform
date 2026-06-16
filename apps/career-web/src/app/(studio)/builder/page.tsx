import Link from 'next/link'

export const metadata = { title: 'سازنده رزومه' }

export default function BuilderPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-4xl">📄</div>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">سازنده رزومه</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          برای ساخت رزومه، از منوی «رزومه‌های من» شروع کنید.
        </p>
        <Link
          href="/resumes/new"
          className="inline-flex bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] rounded-lg px-4 py-2 text-sm transition-colors"
        >
          ساخت رزومه جدید
        </Link>
      </div>
    </div>
  )
}
