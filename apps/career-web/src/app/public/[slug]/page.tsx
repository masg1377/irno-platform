import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicResume } from '@/lib/api'
import type { ResumeSectionDto, PublicPortfolioProjectDto, PublicCertificateDto } from '@irno/types'
import { ShareButton } from './ShareButton'
import { DownloadButton } from './DownloadButton'

interface Props {
  params: Promise<{ slug: string }>
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getPublicResume(slug)
  if (!data) return { title: 'پروفایل یافت نشد', robots: { index: false } }
  return {
    title: data.seoTitle || data.displayName,
    description: data.seoDescription || data.headline || undefined,
    openGraph: {
      title: data.seoTitle || data.displayName,
      description: data.seoDescription || data.headline || undefined,
      type: 'profile',
    },
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatPersianDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long' }).format(d)
  } catch {
    return dateStr
  }
}

function TechChips({ techs, max = 6 }: { techs: string[]; max?: number }) {
  const visible = techs.slice(0, max)
  const overflow = techs.length - max
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {visible.map((t, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
        >
          {t}
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600">
          +{overflow}
        </span>
      )}
    </div>
  )
}

// ── Section Heading ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-base font-bold text-gray-900 dark:text-white shrink-0">{children}</h2>
      <div className="flex-1 border-b border-gray-100 dark:border-slate-700" />
    </div>
  )
}

// ── Resume Section Renderers ──────────────────────────────────────────────────

function SummarySection({ section }: { section: ResumeSectionDto }) {
  const text = typeof section.content.text === 'string' ? section.content.text : ''
  if (!text) return null
  return (
    <div id="section-summary" className="mb-8">
      <SectionHeading>{section.title}</SectionHeading>
      <blockquote className="border-r-4 border-blue-300 dark:border-blue-500 pr-4 text-gray-600 dark:text-slate-300 leading-relaxed text-sm bg-blue-50/50 dark:bg-blue-900/10 rounded-r-lg py-3">
        {text}
      </blockquote>
    </div>
  )
}

function ExperienceSection({ section }: { section: ResumeSectionDto }) {
  const items = Array.isArray(section.content.items)
    ? (section.content.items as Record<string, unknown>[])
    : []
  if (!items.length) return null
  return (
    <div id="section-experience" className="mb-8">
      <SectionHeading>{section.title}</SectionHeading>
      <div className="space-y-6">
        {items.map((item, i) => {
          const role = String(item.role ?? item.position ?? item.title ?? '')
          const company = String(item.company ?? item.organization ?? '')
          const location = typeof item.location === 'string' ? item.location : null
          const startDate = typeof item.startDate === 'string' ? item.startDate : null
          const endDate = typeof item.endDate === 'string' ? item.endDate : null
          const isCurrent = item.isCurrent === true
          const description = typeof item.description === 'string' ? item.description : null
          const achievements = Array.isArray(item.achievements)
            ? (item.achievements as string[])
            : []
          const technologies = Array.isArray(item.technologies)
            ? (item.technologies as string[])
            : []

          return (
            <div key={i} className="relative pr-6 border-r-2 border-blue-100 dark:border-blue-900 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
              <div className="absolute right-[-5px] top-2.5 h-2.5 w-2.5 rounded-full bg-blue-400 dark:bg-blue-500 ring-2 ring-white dark:ring-slate-800" />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{role}</div>
                  {company && (
                    <div className="text-blue-600 dark:text-blue-400 text-xs font-medium mt-0.5">{company}</div>
                  )}
                </div>
                <div className="text-xs text-gray-400 dark:text-slate-500 text-left shrink-0 flex flex-wrap items-center gap-1">
                  {startDate && <span>{startDate}</span>}
                  {(startDate || endDate) && <span>—</span>}
                  {isCurrent
                    ? <span className="text-green-600 dark:text-green-400 font-medium">اکنون</span>
                    : endDate ? <span>{endDate}</span> : null}
                  {location && (
                    <>
                      <span className="text-gray-200 dark:text-slate-600">|</span>
                      <span>{location}</span>
                    </>
                  )}
                </div>
              </div>
              {description && (
                <p className="mt-2 text-xs text-gray-600 dark:text-slate-400 leading-relaxed">{description}</p>
              )}
              {achievements.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {achievements.map((a, j) => (
                    <li key={j} className="text-xs text-gray-600 dark:text-slate-400 flex gap-2">
                      <span className="text-blue-400 dark:text-blue-500 shrink-0 mt-0.5">•</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              )}
              {technologies.length > 0 && <TechChips techs={technologies} max={8} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EducationSection({ section }: { section: ResumeSectionDto }) {
  const items = Array.isArray(section.content.items)
    ? (section.content.items as Record<string, unknown>[])
    : []
  if (!items.length) return null
  return (
    <div id="section-education" className="mb-8">
      <SectionHeading>{section.title}</SectionHeading>
      <div className="space-y-3">
        {items.map((item, i) => {
          const institution = String(item.institution ?? item.school ?? '')
          const degree = String(item.degree ?? '')
          const field = String(item.field ?? item.major ?? '')
          const startDate = typeof item.startDate === 'string' ? item.startDate : null
          const endDate = typeof item.endDate === 'string' ? item.endDate : null
          const gpa = typeof item.gpa === 'string' || typeof item.gpa === 'number' ? String(item.gpa) : null

          return (
            <div key={i} className="rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/40 px-5 py-4 hover:shadow-sm dark:hover:bg-slate-700/60 transition-colors">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">{institution}</div>
                  {(degree || field) && (
                    <div className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">
                      {degree}
                      {degree && field ? ' — ' : ''}
                      {field}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 dark:text-slate-500 text-left flex flex-wrap items-center gap-1">
                  {startDate && <span>{startDate}</span>}
                  {(startDate || endDate) && <span>—</span>}
                  {endDate
                    ? <span>{endDate}</span>
                    : startDate ? <span className="text-green-600 dark:text-green-400 font-medium">اکنون</span> : null}
                  {gpa && <span className="mr-1 text-gray-300 dark:text-slate-600">| GPA: {gpa}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SkillSection({ section }: { section: ResumeSectionDto }) {
  const groups = Array.isArray(section.content.groups)
    ? (section.content.groups as { label?: string; name?: string; skills: string[] }[])
    : []
  if (!groups.length) return null
  return (
    <div id="section-skills" className="mb-8">
      <SectionHeading>{section.title}</SectionHeading>
      <div className="space-y-4">
        {groups.map((g, i) => {
          const label = g.label ?? g.name ?? ''
          const skills = Array.isArray(g.skills) ? g.skills : []
          return (
            <div key={i}>
              {label && (
                <div className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  {label}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s, j) => (
                  <span
                    key={j}
                    className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 px-3 py-1 text-xs text-blue-700 dark:text-blue-300 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProjectResumeSection({ section }: { section: ResumeSectionDto }) {
  const items = Array.isArray(section.content.items)
    ? (section.content.items as Record<string, unknown>[])
    : []
  if (!items.length) return null
  return (
    <div id="section-projects" className="mb-8">
      <SectionHeading>{section.title}</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item, i) => {
          const title = String(item.title ?? '')
          const role = typeof item.role === 'string' ? item.role : null
          const description = typeof item.description === 'string' ? item.description : null
          const techs = Array.isArray(item.technologies) ? (item.technologies as string[]) : []
          const demoUrl = typeof item.demoUrl === 'string' ? item.demoUrl : null
          const repoUrl = typeof item.repoUrl === 'string' ? item.repoUrl : null

          return (
            <div key={i} className="rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/40 p-4 hover:shadow-sm dark:hover:bg-slate-700/60 transition-colors">
              <div className="font-semibold text-gray-900 dark:text-white text-sm">{title}</div>
              {role && <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-medium">{role}</div>}
              {description && (
                <p className="mt-2 text-xs text-gray-600 dark:text-slate-400 leading-relaxed line-clamp-3">{description}</p>
              )}
              {techs.length > 0 && <TechChips techs={techs} max={5} />}
              {(demoUrl || repoUrl) && (
                <div className="mt-3 flex gap-3 flex-wrap">
                  {demoUrl && (
                    <a
                      href={demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded font-medium"
                    >
                      🔗 دمو
                    </a>
                  )}
                  {repoUrl && (
                    <a
                      href={repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 dark:text-slate-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded font-medium"
                    >
                      GitHub ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LanguageSection({ section }: { section: ResumeSectionDto }) {
  const items = Array.isArray(section.content.items)
    ? (section.content.items as { language: string; level: string }[])
    : []
  if (!items.length) return null
  return (
    <div id="section-languages" className="mb-8">
      <SectionHeading>{section.title}</SectionHeading>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/40 px-4 py-3">
            <div className="text-sm font-medium text-gray-900 dark:text-white">{item.language}</div>
            {item.level && (
              <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{item.level}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CertificateResumeSection({ section }: { section: ResumeSectionDto }) {
  const items = Array.isArray(section.content.items)
    ? (section.content.items as Record<string, unknown>[])
    : []
  if (!items.length) return null
  return (
    <div className="mb-8">
      <SectionHeading>{section.title}</SectionHeading>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/40 px-4 py-3">
            <div className="mt-0.5 text-green-500 dark:text-green-400 shrink-0">✓</div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">{String(item.title ?? '')}</div>
              {item.issuer != null && (
                <div className="text-xs text-gray-500 dark:text-slate-400">{String(item.issuer)}</div>
              )}
              {item.date != null && (
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{String(item.date)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LinkSection({ section }: { section: ResumeSectionDto }) {
  const items = Array.isArray(section.content.items)
    ? (section.content.items as { label: string; url: string }[])
    : []
  if (!items.length) return null
  return (
    <div className="mb-8">
      <SectionHeading>{section.title}</SectionHeading>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {item.label || item.url}
          </a>
        ))}
      </div>
    </div>
  )
}

function TextSection({ section }: { section: ResumeSectionDto }) {
  const text = typeof section.content.text === 'string' ? section.content.text : ''
  if (!text) return null
  return (
    <div className="mb-8">
      <SectionHeading>{section.title}</SectionHeading>
      <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{text}</p>
    </div>
  )
}

function ResumeSection({ section }: { section: ResumeSectionDto }) {
  if (!section.isVisible) return null
  switch (section.type) {
    case 'SUMMARY':
      return <SummarySection section={section} />
    case 'EXPERIENCE':
      return <ExperienceSection section={section} />
    case 'EDUCATION':
      return <EducationSection section={section} />
    case 'SKILL':
      return <SkillSection section={section} />
    case 'PROJECT':
      return <ProjectResumeSection section={section} />
    case 'LANGUAGE':
      return <LanguageSection section={section} />
    case 'CERTIFICATE':
      return <CertificateResumeSection section={section} />
    case 'LINK':
      return <LinkSection section={section} />
    case 'TEXT_BLOCK':
    case 'CUSTOM':
      return <TextSection section={section} />
    default:
      return <TextSection section={section} />
  }
}

// ── Portfolio Card ────────────────────────────────────────────────────────────

function PortfolioCard({ project }: { project: PublicPortfolioProjectDto }) {
  const pAny = project as any

  // Phase 21: structured case study fields
  const hasCaseStudy = pAny.problem || pAny.solution || pAny.impact
  const hasResponsibilities = Array.isArray(pAny.responsibilities) && pAny.responsibilities.length > 0

  // Legacy caseStudy JSON field (backward compat with Phase 14–20)
  const legacyCaseStudy = project.caseStudy as {
    challenge?: string
    solution?: string
    result?: string
  } | null
  const hasLegacyCaseStudy = legacyCaseStudy && (legacyCaseStudy.challenge || legacyCaseStudy.solution || legacyCaseStudy.result)

  // Summary: use new summary field first, then truncate description
  const summaryText = pAny.summary || (project.description ? project.description.slice(0, 150) + (project.description.length > 150 ? '…' : '') : null)

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow">
      {/* Cover image */}
      {project.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.coverImageUrl}
          alt={project.title}
          className="w-full h-44 object-cover"
        />
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
          <svg className="h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      <div className="p-5">
        {/* Featured badge + title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="font-bold text-gray-900 dark:text-white text-sm">{project.title}</div>
          {project.isFeatured && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              ⭐ شاخص
            </span>
          )}
        </div>

        {/* Role + Client */}
        <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
          {project.role && (
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">{project.role}</div>
          )}
          {pAny.clientName && (
            <div className="text-xs text-gray-400 dark:text-slate-500">— {pAny.clientName}</div>
          )}
        </div>

        {/* Date range */}
        {(project.startDate || project.endDate) && (
          <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
            {project.startDate && <span>{String(project.startDate)}</span>}
            {project.startDate && project.endDate && <span> — </span>}
            {project.endDate && <span>{String(project.endDate)}</span>}
          </div>
        )}

        {/* Summary */}
        {summaryText && (
          <p className="mt-2 text-xs text-gray-600 dark:text-slate-400 leading-relaxed line-clamp-2">
            {summaryText}
          </p>
        )}

        {/* Impact callout */}
        {pAny.impact && (
          <div className="mt-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 px-3 py-1.5">
            <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed line-clamp-2">
              📈 {pAny.impact}
            </p>
          </div>
        )}

        {/* Tech chips */}
        {project.technologies.length > 0 && (
          <TechChips techs={project.technologies} max={6} />
        )}

        {/* Links */}
        {(project.demoUrl || project.repoUrl) && (
          <div className="mt-3 flex gap-3 flex-wrap">
            {project.demoUrl && (
              <a href={project.demoUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded font-medium">
                🔗 دمو
              </a>
            )}
            {project.repoUrl && (
              <a href={project.repoUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded font-medium">
                GitHub ↗
              </a>
            )}
          </div>
        )}

        {/* Phase 21: structured case study expandable */}
        {(hasCaseStudy || hasLegacyCaseStudy) && (
          <details className="mt-3 group">
            <summary className="cursor-pointer text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 select-none list-none flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded transition-colors">
              <svg className="h-3 w-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              مشاهده کیس استادی ↓
            </summary>
            <div className="mt-2 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600 p-3 space-y-3">
              {/* Phase 21 structured fields */}
              {pAny.problem && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-0.5">🔍 مسئله</div>
                  <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">{pAny.problem}</p>
                </div>
              )}
              {pAny.solution && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-0.5">💡 راه‌حل</div>
                  <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">{pAny.solution}</p>
                </div>
              )}
              {hasResponsibilities && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">✅ مسئولیت‌ها</div>
                  <ul className="space-y-0.5">
                    {(pAny.responsibilities as string[]).map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-slate-400">
                        <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-400 dark:bg-blue-500 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {pAny.impact && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-0.5">📈 نتیجه و اثر</div>
                  <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">{pAny.impact}</p>
                </div>
              )}

              {/* Legacy caseStudy JSON (backward compat) */}
              {!hasCaseStudy && hasLegacyCaseStudy && (
                <>
                  {legacyCaseStudy!.challenge && (
                    <div>
                      <div className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-0.5">چالش</div>
                      <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">{legacyCaseStudy!.challenge}</p>
                    </div>
                  )}
                  {legacyCaseStudy!.solution && (
                    <div>
                      <div className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-0.5">راه‌حل</div>
                      <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">{legacyCaseStudy!.solution}</p>
                    </div>
                  )}
                  {legacyCaseStudy!.result && (
                    <div>
                      <div className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-0.5">نتیجه</div>
                      <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">{legacyCaseStudy!.result}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// ── Certificate Card ──────────────────────────────────────────────────────────

function CertificateCard({
  cert,
  hubWebUrl,
}: {
  cert: PublicCertificateDto
  hubWebUrl: string
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/40 px-5 py-4 hover:shadow-sm dark:hover:bg-slate-700/60 transition-colors">
      <div className="shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800">
        <svg className="h-5 w-5 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 dark:text-white text-sm">{cert.title}</div>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-green-400 inline-block" />
            تایید شده
          </span>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            {formatPersianDate(cert.issuedAt)}
          </span>
        </div>
      </div>
      <a
        href={`${hubWebUrl}/verify/certificate/${cert.verificationCode}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded font-medium"
      >
        تایید مدرک ↗
      </a>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default async function PublicProfilePage({ params }: Props) {
  const { slug } = await params
  const data = await getPublicResume(slug)

  const HUB_WEB_URL = process.env['NEXT_PUBLIC_HUB_WEB_URL'] ?? 'http://localhost:3000'
  const CAREER_WEB_URL = process.env['NEXT_PUBLIC_CAREER_WEB_URL'] ?? 'http://localhost:3002'

  // 404 state
  if (!data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900"
        dir="rtl"
      >
        <div className="text-center space-y-4 px-6 max-w-sm mx-auto">
          <div className="text-6xl mb-4 select-none">🔍</div>
          <h1 className="text-2xl font-bold text-white">پروفایل یافت نشد</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            این پروفایل وجود ندارد یا برای عموم در دسترس نیست.
          </p>
          <Link
            href={CAREER_WEB_URL}
            className="inline-block mt-4 text-sm text-blue-400 hover:text-blue-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded transition-colors"
          >
            ← بازگشت به ایرنو CV
          </Link>
        </div>
      </div>
    )
  }

  const resume = data.resume
  const sections = resume ? resume.sections.filter((s) => s.isVisible) : []
  const portfolioProjects = data.portfolioProjects ?? []
  const certificates = data.certificates ?? []
  const contact = data.contact
  const cv = data.contactVisibility

  // Featured projects first
  const sortedProjects = [...portfolioProjects].sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1
    if (!a.isFeatured && b.isFeatured) return 1
    return a.sortOrder - b.sortOrder
  })

  // Detect which tab anchors exist
  const hasSummary =
    !!data.summary ||
    sections.some((s) => s.type === 'SUMMARY')
  const hasExperience = sections.some((s) => s.type === 'EXPERIENCE')
  const hasSkills = sections.some((s) => s.type === 'SKILL')
  const hasEducation = sections.some((s) => s.type === 'EDUCATION')
  const hasProjects =
    sections.some((s) => s.type === 'PROJECT') || portfolioProjects.length > 0
  const hasCertificates = certificates.length > 0

  const hasAnyTab = hasSummary || hasExperience || hasSkills || hasEducation || hasProjects || hasCertificates

  const dir = resume?.language === 'EN' ? 'ltr' : 'rtl'

  const pageUrl = `${CAREER_WEB_URL}/public/${slug}`

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors" dir="rtl">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="flex flex-col items-center text-center gap-5">
            {/* Avatar */}
            {data.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.avatarUrl}
                alt={data.displayName}
                className="h-20 w-20 sm:h-28 sm:w-28 rounded-full object-cover border-4 border-white/20 shadow-2xl ring-4 ring-white/5"
              />
            ) : (
              <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-4 border-white/20 shadow-2xl ring-4 ring-white/5 flex items-center justify-center">
                <span className="text-xl sm:text-3xl font-bold text-white select-none">
                  {getInitials(data.displayName)}
                </span>
              </div>
            )}

            {/* Name + headline */}
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
                {data.displayName}
              </h1>
              {data.headline && (
                <p className="text-slate-300 text-sm sm:text-base max-w-xs sm:max-w-md mx-auto leading-relaxed">
                  {data.headline}
                </p>
              )}
              {resume?.targetRole && (
                <div className="pt-1">
                  <span className="inline-flex items-center rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1">
                    <span className="text-blue-300 text-xs font-medium">{resume.targetRole}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Contact row */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              {cv.showLocation && contact.location && (
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {contact.location}
                </span>
              )}
              {cv.showWebsite && contact.website && (
                <a
                  href={contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded transition-colors"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                  </svg>
                  وبسایت
                </a>
              )}
              {cv.showLinkedin && contact.linkedinUrl && (
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded transition-colors"
                >
                  LinkedIn ↗
                </a>
              )}
              {cv.showGithub && contact.githubUrl && (
                <a
                  href={contact.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded transition-colors"
                >
                  GitHub ↗
                </a>
              )}
              {cv.showEmail && contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded transition-colors"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {contact.email}
                </a>
              )}
              {cv.showPhone && contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded transition-colors"
                  dir="ltr"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {contact.phone}
                </a>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-1">
              <ShareButton url={pageUrl} displayName={data.displayName} />
              {resume?.allowPdfDownload && (
                <DownloadButton
                  slug={slug}
                  hasPdfExport={(resume as unknown as { hasPdfExport?: boolean }).hasPdfExport ?? false}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── STICKY TABS ──────────────────────────────────────── */}
      {hasAnyTab && (
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="max-w-3xl mx-auto px-2 sm:px-4 overflow-x-auto">
            <nav className="flex gap-0 text-sm whitespace-nowrap" aria-label="بخش‌های پروفایل">
              {hasSummary && (
                <a href="#section-summary" className="px-3 sm:px-4 py-3 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-b-2 hover:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 transition-colors font-medium text-xs sm:text-sm">
                  درباره
                </a>
              )}
              {hasExperience && (
                <a href="#section-experience" className="px-3 sm:px-4 py-3 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-b-2 hover:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 transition-colors font-medium text-xs sm:text-sm">
                  تجربه
                </a>
              )}
              {hasSkills && (
                <a href="#section-skills" className="px-3 sm:px-4 py-3 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-b-2 hover:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 transition-colors font-medium text-xs sm:text-sm">
                  مهارت‌ها
                </a>
              )}
              {hasEducation && (
                <a href="#section-education" className="px-3 sm:px-4 py-3 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-b-2 hover:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 transition-colors font-medium text-xs sm:text-sm">
                  تحصیلات
                </a>
              )}
              {hasProjects && (
                <a href="#section-projects" className="px-3 sm:px-4 py-3 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-b-2 hover:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 transition-colors font-medium text-xs sm:text-sm">
                  پروژه‌ها
                </a>
              )}
              {hasCertificates && (
                <a href="#section-certificates" className="px-3 sm:px-4 py-3 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-b-2 hover:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 transition-colors font-medium text-xs sm:text-sm">
                  مدارک
                </a>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-7 sm:px-10 sm:py-9" dir={dir}>
            {/* Profile summary from career profile (not resume section) */}
            {data.summary && !sections.some((s) => s.type === 'SUMMARY') && (
              <div id="section-summary" className="mb-8">
                <SectionHeading>درباره</SectionHeading>
                <blockquote className="border-r-4 border-blue-300 dark:border-blue-500 pr-4 text-gray-600 dark:text-slate-300 leading-relaxed text-sm bg-blue-50/50 dark:bg-blue-900/10 rounded-r-lg py-3">
                  {data.summary}
                </blockquote>
              </div>
            )}

            {/* Resume sections */}
            {sections.map((section) => (
              <ResumeSection key={section.id} section={section} />
            ))}

            {/* Empty state when no resume content */}
            {sections.length === 0 && !data.summary && (
              <div className="py-12 text-center">
                <div className="text-4xl mb-3 select-none">📋</div>
                <p className="text-gray-400 dark:text-slate-500 text-sm">
                  هنوز محتوایی اضافه نشده است.
                </p>
              </div>
            )}
          </div>

          {/* ── PORTFOLIO PROJECTS ──────────────────────────── */}
          {sortedProjects.length > 0 && (
            <div id="section-projects" className="border-t border-gray-100 dark:border-slate-700 px-5 py-7 sm:px-10 sm:py-9" dir="rtl">
              <SectionHeading>پورتفولیو</SectionHeading>
              <div className="grid gap-5 sm:grid-cols-2">
                {sortedProjects.map((project) => (
                  <PortfolioCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          {/* ── CERTIFICATES ────────────────────────────────── */}
          {certificates.length > 0 && (
            <div id="section-certificates" className="border-t border-gray-100 dark:border-slate-700 px-5 py-7 sm:px-10 sm:py-9" dir="rtl">
              <SectionHeading>مدارک و گواهینامه‌ها</SectionHeading>
              <div className="space-y-3">
                {certificates.map((cert) => (
                  <CertificateCard key={cert.id} cert={cert} hubWebUrl={HUB_WEB_URL} />
                ))}
              </div>
            </div>
          )}

          {/* ── FOOTER ──────────────────────────────────────── */}
          <div className="border-t border-gray-100 dark:border-slate-700 px-6 py-5 bg-gray-50 dark:bg-slate-800/50 text-center" dir="rtl">
            <p className="text-xs text-gray-400 dark:text-slate-500">
              ساخته‌شده با{' '}
              <a
                href={CAREER_WEB_URL}
                className="font-semibold text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded transition-colors"
              >
                ایرنو CV
              </a>
              {' '}— Career Studio
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
