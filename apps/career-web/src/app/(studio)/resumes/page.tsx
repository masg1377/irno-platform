import Link from 'next/link'
import { listResumes } from '@/lib/api'
import { fa } from '@irno/i18n'
import { ResumeListActions } from './ResumeListActions'

export const metadata = { title: 'رزومه‌های من' }

export default async function ResumesPage() {
  const result = await listResumes()
  const resumes = result?.data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">رزومه‌های من</h1>
        <Link
          href="/resumes/new"
          className="bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] rounded-lg px-4 py-2 text-sm transition-colors"
        >
          + ساخت رزومه جدید
        </Link>
      </div>

      {/* Empty state */}
      {resumes.length === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
          <div className="text-4xl mb-3">📄</div>
          <div className="text-sm font-medium text-[var(--color-text-primary)] mb-1">هنوز رزومه‌ای ندارید</div>
          <div className="text-xs text-[var(--color-text-muted)] mb-4">اولین رزومه حرفه‌ای خود را بسازید</div>
          <Link
            href="/resumes/new"
            className="inline-flex bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] rounded-lg px-4 py-2 text-sm transition-colors"
          >
            ساخت رزومه جدید
          </Link>
        </div>
      )}

      {/* Resume list */}
      {resumes.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                  عنوان
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden sm:table-cell">
                  موقعیت هدف
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                  زبان
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                  دسترسی
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden md:table-cell">
                  آخرین خروجی
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {resumes.map((resume) => (
                <tr key={resume.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--color-text-primary)]">{resume.title}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)] hidden sm:table-cell">
                    {resume.targetRole ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
                      {fa.resumeLanguage[resume.language]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: resume.visibility === 'PUBLIC_LINK' ? 'rgba(34,197,94,0.1)' : 'var(--color-bg-subtle)',
                        color: resume.visibility === 'PUBLIC_LINK' ? 'var(--color-success)' : 'var(--color-text-muted)',
                        border: `1px solid ${resume.visibility === 'PUBLIC_LINK' ? 'var(--color-success)' : 'var(--color-border)'}`,
                      }}
                    >
                      {fa.resumeVisibility[resume.visibility]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)] hidden md:table-cell">
                    {resume.lastExportedAt
                      ? new Date(resume.lastExportedAt).toLocaleDateString('fa-IR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ResumeListActions resumeId={resume.id} resumeTitle={resume.title} />
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
