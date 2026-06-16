import Link from 'next/link'
import { listRoadmaps } from '@/lib/api'
import { fa } from '@irno/i18n'

export const metadata = { title: 'مسیر شغلی' }

export default async function RoadmapPage() {
  const result = await listRoadmaps()
  const roadmaps = result?.data?.filter((r) => r.status === 'PUBLISHED') ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">مسیر شغلی</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          نقشه راه یادگیری و رشد شغلی برای حوزه‌های مختلف را دنبال کنید.
        </p>
      </div>

      {/* Empty state */}
      {roadmaps.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
          <div className="text-4xl mb-3">🗺️</div>
          <div className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
            مسیرهای شغلی در حال آماده‌سازی است
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">
            به زودی نقشه راه‌های تخصصی برای توسعه‌دهندگان، طراحان و متخصصان هوش مصنوعی اضافه می‌شود.
          </div>
        </div>
      )}

      {/* Roadmap grid */}
      {roadmaps.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roadmaps.map((roadmap) => (
            <Link
              key={roadmap.id}
              href={`/roadmap/${roadmap.slug}`}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 hover:bg-[var(--color-bg-subtle)] transition-colors space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{roadmap.title}</h2>
                <span className="inline-flex items-center rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)] shrink-0">
                  {fa.resumeLanguage[roadmap.language]}
                </span>
              </div>

              {roadmap.description && (
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                  {roadmap.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span>{roadmap.nodeCount} گام</span>
                <span className="text-[var(--color-brand-600)]">مشاهده ←</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
