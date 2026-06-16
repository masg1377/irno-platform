import { listTemplates } from '@/lib/api'
import { fa } from '@irno/i18n'

export const metadata = { title: 'قالب‌های رزومه' }

export default async function TemplatesPage() {
  const templates = await listTemplates()
  const list = templates ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">قالب‌های رزومه</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          قالب مناسب رزومه خود را انتخاب کنید.
        </p>
      </div>

      {/* Empty state */}
      {list.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
          <div className="text-4xl mb-3">🎨</div>
          <div className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
            قالب‌ها در حال آماده‌سازی هستند
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">
            به زودی قالب‌های متنوع فارسی و انگلیسی اضافه می‌شوند.
          </div>
        </div>
      )}

      {/* Template grid */}
      {list.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-3"
            >
              {/* Preview */}
              {tpl.previewUrl ? (
                <div className="aspect-[3/4] rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                  <img
                    src={tpl.previewUrl}
                    alt={tpl.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[3/4] rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-subtle)] flex items-center justify-center">
                  <span className="text-3xl">📄</span>
                </div>
              )}

              {/* Info */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">{tpl.title}</div>
                  {tpl.isPremium && (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 text-xs font-medium shrink-0">
                      Pro
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="inline-flex items-center rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                    {fa.resumeTemplateType[tpl.type]}
                  </span>
                  {tpl.supportsAts && (
                    <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 text-xs font-medium">
                      ATS
                    </span>
                  )}
                  {tpl.supportsRtl && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 text-xs font-medium">
                      RTL
                    </span>
                  )}
                  {tpl.supportsLtr && (
                    <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 text-xs font-medium">
                      LTR
                    </span>
                  )}
                </div>
              </div>

              <a
                href={`/resumes/new?templateId=${tpl.id}`}
                className="flex w-full items-center justify-center bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] rounded-lg px-4 py-2 text-sm transition-colors"
              >
                استفاده از این قالب
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
