import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicResume, getPublicPortfolioProject } from '@/lib/api'
import type { PublicPortfolioProjectDto } from '@irno/types'

interface Props {
  params: Promise<{ slug: string; projectSlug: string }>
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, projectSlug } = await params
  const project = await getPublicPortfolioProject(slug, projectSlug)
  if (!project) return { title: 'پروژه یافت نشد', robots: { index: false } }
  const pAny = project as any
  return {
    title: pAny.seoTitle || project.title,
    description: pAny.seoDescription || pAny.summary || undefined,
    openGraph: {
      title: pAny.seoTitle || project.title,
      description: pAny.seoDescription || pAny.summary || undefined,
      type: 'article',
      images: project.coverImageUrl ? [{ url: project.coverImageUrl }] : [],
    },
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

function TechChip({ tech }: { tech: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
      {tech}
    </span>
  )
}

function SectionCard({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white mb-4">
        <span>{emoji}</span>
        <span>{title}</span>
      </h2>
      {children}
    </div>
  )
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(url)
}

export default async function PublicProjectPage({ params }: Props) {
  const { slug, projectSlug } = await params
  const project = await getPublicPortfolioProject(slug, projectSlug)
  if (!project) notFound()

  const pAny = project as any
  const responsibilities: string[] = Array.isArray(pAny.responsibilities) ? pAny.responsibilities : []
  const mediaUrls: string[] = Array.isArray(pAny.mediaUrls) ? pAny.mediaUrls : []
  const hasStructuredCaseStudy = pAny.problem || pAny.solution || pAny.impact
  const legacyCS = project.caseStudy as { challenge?: string; solution?: string; result?: string } | null
  const hasLegacyCaseStudy = legacyCS && (legacyCS.challenge || legacyCS.solution || legacyCS.result)

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Navigation back */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            href={`/public/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <svg className="h-4 w-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            بازگشت به پروفایل
          </Link>
          <div className="flex-1" />
          {project.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              ⭐ شاخص
            </span>
          )}
        </div>
      </div>

      {/* Cover image */}
      {project.coverImageUrl && (
        <div className="w-full h-64 sm:h-80 overflow-hidden bg-gray-200 dark:bg-slate-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={project.coverImageUrl} alt={project.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Hero */}
        <div className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{project.title}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {project.role && (
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{project.role}</span>
            )}
            {pAny.clientName && (
              <span className="text-sm text-gray-500 dark:text-slate-400">— {pAny.clientName}</span>
            )}
            {pAny.projectType && (
              <span className="inline-flex items-center rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 px-2.5 py-0.5 text-xs text-purple-700 dark:text-purple-300">
                {pAny.projectType}
              </span>
            )}
            {(project.startDate || project.endDate) && (
              <span className="text-xs text-gray-400 dark:text-slate-500">
                {project.startDate && String(project.startDate)}
                {project.startDate && project.endDate && ' — '}
                {project.endDate && String(project.endDate)}
              </span>
            )}
          </div>

          {/* Summary */}
          {pAny.summary && (
            <p className="mt-4 text-gray-700 dark:text-slate-300 leading-relaxed">{pAny.summary}</p>
          )}

          {/* CTA links */}
          {(project.demoUrl || project.repoUrl) && (
            <div className="mt-5 flex flex-wrap gap-3">
              {project.demoUrl && (
                <a href={project.demoUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition-colors">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  مشاهده دمو
                </a>
              )}
              {project.repoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 px-4 py-2 text-sm font-medium transition-colors">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  GitHub / مخزن
                </a>
              )}
            </div>
          )}
        </div>

        {/* Case study: Problem */}
        {pAny.problem && (
          <SectionCard title="مسئله" emoji="🔍">
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{pAny.problem}</p>
          </SectionCard>
        )}

        {/* Case study: Solution */}
        {pAny.solution && (
          <SectionCard title="راه‌حل" emoji="💡">
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{pAny.solution}</p>
          </SectionCard>
        )}

        {/* Responsibilities */}
        {responsibilities.length > 0 && (
          <SectionCard title="مسئولیت‌ها و نقش من" emoji="✅">
            <ul className="space-y-2">
              {responsibilities.map((r: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5 text-gray-700 dark:text-slate-300 text-sm leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 dark:bg-blue-500 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {/* Technologies */}
        {project.technologies.length > 0 && (
          <SectionCard title="تکنولوژی‌ها" emoji="⚙️">
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((t, i) => <TechChip key={i} tech={t} />)}
            </div>
          </SectionCard>
        )}

        {/* Impact */}
        {pAny.impact && (
          <SectionCard title="نتیجه و اثر" emoji="📈">
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{pAny.impact}</p>
          </SectionCard>
        )}

        {/* Legacy case study (backward compat) */}
        {!hasStructuredCaseStudy && hasLegacyCaseStudy && (
          <SectionCard title="کیس استادی" emoji="📋">
            <div className="space-y-4">
              {legacyCS!.challenge && (
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-white mb-1">چالش</div>
                  <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">{legacyCS!.challenge}</p>
                </div>
              )}
              {legacyCS!.solution && (
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-white mb-1">راه‌حل</div>
                  <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">{legacyCS!.solution}</p>
                </div>
              )}
              {legacyCS!.result && (
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-white mb-1">نتیجه</div>
                  <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">{legacyCS!.result}</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Media gallery */}
        {mediaUrls.length > 0 && (
          <SectionCard title="تصاویر و رسانه‌ها" emoji="🖼️">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mediaUrls.map((url, i) =>
                isImageUrl(url) ? (
                  <div key={i} className="rounded-lg overflow-hidden border border-gray-100 dark:border-slate-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`تصویر ${i + 1}`} className="w-full h-48 object-cover" />
                  </div>
                ) : (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-600 p-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span className="truncate">{url}</span>
                  </a>
                )
              )}
            </div>
          </SectionCard>
        )}

        {/* Footer / back */}
        <div className="text-center py-4">
          <Link href={`/public/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors">
            <svg className="h-4 w-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            بازگشت به پروفایل عمومی
          </Link>
        </div>
      </div>
    </div>
  )
}
