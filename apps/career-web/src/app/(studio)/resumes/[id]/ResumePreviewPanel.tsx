'use client'

import { useState, useEffect } from 'react'
import type { ResumeSectionDto, ResumeDocumentDto, ResumeTemplateDto } from '@irno/types'

interface ResumePreviewPanelProps {
  resume: ResumeDocumentDto
  sections: ResumeSectionDto[]
  template?: ResumeTemplateDto | null
}

// ── CSS injected into the preview iframe ──────────────────────────────────

function buildPreviewStyles(resume: ResumeDocumentDto): string {
  const style = resume.styleConfig as Record<string, unknown> | null | undefined
  const fontFamily = (typeof style?.fontFamily === 'string' ? style.fontFamily : 'Vazirmatn') + ', system-ui, sans-serif'
  const fontSize = typeof style?.fontSize === 'number' ? style.fontSize : 11
  const accentColor = typeof style?.accentColor === 'string' ? style.accentColor : '#1e293b'
  const spacing = typeof style?.spacing === 'string' ? style.spacing : 'normal'

  const spacingMap: Record<string, { section: string; item: string }> = {
    compact: { section: '10px', item: '6px' },
    normal: { section: '16px', item: '10px' },
    comfortable: { section: '22px', item: '14px' },
  }
  const s = spacingMap[spacing] ?? spacingMap.normal

  const wm = resume.watermarkConfig as Record<string, unknown> | null | undefined
  const wmText = typeof wm?.text === 'string' ? wm.text : 'ایرنو CV'
  const wmOpacity = typeof wm?.opacity === 'number' ? wm.opacity : 0.07

  return `
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: ${fontFamily};
      font-size: ${fontSize}pt;
      color: #1e293b;
      background: white;
      direction: rtl;
      text-align: right;
      padding: 0;
    }

    .page {
      max-width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      padding: 40px 48px;
      position: relative;
      background: white;
    }

    /* Watermark */
    ${resume.includeWatermark ? `
    .page::after {
      content: "${wmText}";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80pt;
      color: #1e293b;
      opacity: ${wmOpacity};
      pointer-events: none;
      white-space: nowrap;
      font-weight: 900;
      letter-spacing: 0.05em;
      user-select: none;
      z-index: 0;
    }` : ''}

    .content { position: relative; z-index: 1; }

    /* Header */
    .resume-header {
      border-bottom: 2px solid ${accentColor};
      padding-bottom: 14px;
      margin-bottom: ${s.section};
    }

    .resume-name {
      font-size: 22pt;
      font-weight: 700;
      color: ${accentColor};
      margin-bottom: 4px;
    }

    .resume-title {
      font-size: 12pt;
      color: #64748b;
      margin-bottom: 8px;
    }

    .resume-contacts {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 9pt;
      color: #475569;
      direction: ltr;
      justify-content: flex-end;
    }

    .resume-contacts a { color: ${accentColor}; text-decoration: none; }

    /* Sections */
    .section {
      margin-bottom: ${s.section};
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: ${accentColor};
      border-bottom: 1px solid ${accentColor}20;
      padding-bottom: 4px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Experience item */
    .exp-item {
      margin-bottom: ${s.item};
    }

    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 3px;
    }

    .exp-role { font-weight: 600; font-size: 10.5pt; color: #0f172a; }
    .exp-company { font-weight: 500; color: #334155; font-size: 9.5pt; }
    .exp-dates { font-size: 8.5pt; color: #64748b; white-space: nowrap; direction: ltr; }

    .exp-description {
      font-size: 9pt;
      color: #475569;
      margin: 4px 0;
      line-height: 1.5;
    }

    .achievements {
      margin-top: 4px;
      padding-right: 14px;
      list-style: none;
    }

    .achievements li {
      font-size: 9pt;
      color: #334155;
      margin-bottom: 2px;
      position: relative;
      line-height: 1.5;
    }

    .achievements li::before {
      content: "•";
      position: absolute;
      right: -12px;
      color: ${accentColor};
    }

    .tech-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 5px;
      direction: ltr;
      justify-content: flex-end;
    }

    .tech-tag {
      background: ${accentColor}12;
      color: ${accentColor};
      border: 1px solid ${accentColor}25;
      border-radius: 3px;
      padding: 1px 7px;
      font-size: 7.5pt;
      font-weight: 500;
    }

    /* Education */
    .edu-item {
      margin-bottom: ${s.item};
    }

    .edu-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .edu-degree { font-weight: 600; font-size: 10pt; }
    .edu-institution { font-size: 9pt; color: #64748b; margin-top: 1px; }
    .edu-dates { font-size: 8.5pt; color: #64748b; direction: ltr; }

    /* Skills */
    .skill-groups { display: flex; flex-direction: column; gap: 6px; }

    .skill-group { display: flex; align-items: flex-start; gap: 10px; }

    .skill-group-name {
      font-weight: 600;
      font-size: 9pt;
      color: #334155;
      min-width: 90px;
      padding-top: 2px;
    }

    .skill-items {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      flex: 1;
    }

    .skill-item {
      font-size: 8.5pt;
      color: #475569;
    }

    .skill-item + .skill-item::before {
      content: "،";
      margin-left: 2px;
    }

    /* Project */
    .project-item {
      margin-bottom: ${s.item};
    }

    .project-title { font-weight: 600; font-size: 10pt; }

    .project-links {
      display: flex;
      gap: 8px;
      direction: ltr;
      justify-content: flex-end;
      margin-bottom: 3px;
    }

    .project-link {
      font-size: 8pt;
      color: ${accentColor};
    }

    /* Certificate */
    .cert-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }

    .cert-title { font-weight: 600; font-size: 9.5pt; }
    .cert-issuer { font-size: 8.5pt; color: #64748b; }
    .cert-date { font-size: 8pt; color: #94a3b8; direction: ltr; }

    /* Language */
    .lang-items {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .lang-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 9pt;
    }

    .lang-name { font-weight: 500; }

    .lang-level {
      color: #64748b;
      font-size: 8pt;
    }

    /* Links */
    .link-items {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .link-item a {
      font-size: 9pt;
      color: ${accentColor};
    }

    /* Summary */
    .summary-text {
      font-size: 9.5pt;
      color: #475569;
      line-height: 1.65;
    }

    /* Print */
    @media print {
      body { padding: 0; }
      .page { padding: 28px 36px; box-shadow: none; }
    }
  `
}

// ── HTML builder ───────────────────────────────────────────────────────────

type ContentMap = Record<string, unknown>

function renderSummary(content: ContentMap): string {
  const text = typeof content.text === 'string' ? content.text : ''
  if (!text) return '<p style="color:#94a3b8;font-size:9pt;">(خلاصه‌ای وارد نشده)</p>'
  return `<p class="summary-text">${escHtml(text)}</p>`
}

function renderExperience(content: ContentMap): string {
  const items = Array.isArray(content.items) ? content.items as ContentMap[] : []
  if (!items.length) return '<p style="color:#94a3b8;font-size:9pt;">(موردی وارد نشده)</p>'

  return items.map((item) => {
    const techs = Array.isArray(item.technologies) ? item.technologies as string[] : []
    const achievements = Array.isArray(item.achievements) ? item.achievements as string[] : []
    return `
      <div class="exp-item">
        <div class="exp-header">
          <div>
            <div class="exp-role">${escHtml(String(item.role ?? ''))}</div>
            <div class="exp-company">${escHtml(String(item.company ?? ''))}${item.location ? ` · ${escHtml(String(item.location))}` : ''}</div>
          </div>
          <div class="exp-dates">${formatDateRange(String(item.startDate ?? ''), String(item.endDate ?? ''), item.isCurrent === true)}</div>
        </div>
        ${item.description ? `<p class="exp-description">${escHtml(String(item.description))}</p>` : ''}
        ${achievements.length ? `<ul class="achievements">${achievements.map(a => `<li>${escHtml(a)}</li>`).join('')}</ul>` : ''}
        ${techs.length ? `<div class="tech-tags">${techs.map(t => `<span class="tech-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
      </div>
    `
  }).join('')
}

function renderEducation(content: ContentMap): string {
  const items = Array.isArray(content.items) ? content.items as ContentMap[] : []
  if (!items.length) return '<p style="color:#94a3b8;font-size:9pt;">(موردی وارد نشده)</p>'
  return items.map((item) => `
    <div class="edu-item">
      <div class="edu-header">
        <div>
          <div class="edu-degree">${escHtml(String(item.degree ?? ''))}${item.field ? ` — ${escHtml(String(item.field))}` : ''}</div>
          <div class="edu-institution">${escHtml(String(item.institution ?? ''))}</div>
        </div>
        <div class="edu-dates">${formatDateRange(String(item.startDate ?? ''), String(item.endDate ?? ''), false)}</div>
      </div>
    </div>
  `).join('')
}

function renderProject(content: ContentMap): string {
  const items = Array.isArray(content.items) ? content.items as ContentMap[] : []
  if (!items.length) return '<p style="color:#94a3b8;font-size:9pt;">(موردی وارد نشده)</p>'
  return items.map((item) => {
    const techs = Array.isArray(item.technologies) ? item.technologies as string[] : []
    const features = Array.isArray(item.features) ? item.features as string[] : []
    return `
      <div class="project-item">
        <div class="exp-header">
          <div>
            <div class="project-title">${escHtml(String(item.title ?? ''))}</div>
            ${item.role ? `<div class="exp-company">${escHtml(String(item.role))}</div>` : ''}
          </div>
          <div class="project-links">
            ${item.demoUrl ? `<a class="project-link" href="${escHtml(String(item.demoUrl))}" target="_blank">Demo</a>` : ''}
            ${item.repoUrl ? `<a class="project-link" href="${escHtml(String(item.repoUrl))}" target="_blank">GitHub</a>` : ''}
          </div>
        </div>
        ${item.description ? `<p class="exp-description">${escHtml(String(item.description))}</p>` : ''}
        ${features.length ? `<ul class="achievements">${features.map(f => `<li>${escHtml(f)}</li>`).join('')}</ul>` : ''}
        ${techs.length ? `<div class="tech-tags">${techs.map(t => `<span class="tech-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
      </div>
    `
  }).join('')
}

function renderSkill(content: ContentMap): string {
  const groups = Array.isArray(content.groups) ? content.groups as ContentMap[] : []
  if (!groups.length) return '<p style="color:#94a3b8;font-size:9pt;">(موردی وارد نشده)</p>'
  return `<div class="skill-groups">${groups.map(g => {
    const skills = Array.isArray(g.skills) ? g.skills as string[] : []
    return `
      <div class="skill-group">
        <span class="skill-group-name">${escHtml(String(g.name ?? ''))}</span>
        <div class="skill-items">${skills.map(s => `<span class="skill-item">${escHtml(s)}</span>`).join('')}</div>
      </div>
    `
  }).join('')}</div>`
}

function renderCertificate(content: ContentMap): string {
  const items = Array.isArray(content.items) ? content.items as ContentMap[] : []
  if (!items.length) return '<p style="color:#94a3b8;font-size:9pt;">(موردی وارد نشده)</p>'
  return items.map(item => `
    <div class="cert-item">
      <div>
        <div class="cert-title">${escHtml(String(item.title ?? ''))}</div>
        <div class="cert-issuer">${escHtml(String(item.issuer ?? ''))}</div>
      </div>
      <div class="cert-date">${escHtml(String(item.issuedAt ?? ''))}</div>
    </div>
  `).join('')
}

function renderLanguage(content: ContentMap): string {
  const items = Array.isArray(content.items) ? content.items as ContentMap[] : []
  if (!items.length) return '<p style="color:#94a3b8;font-size:9pt;">(موردی وارد نشده)</p>'
  return `<div class="lang-items">${items.map(item => `
    <div class="lang-item">
      <span class="lang-name">${escHtml(String(item.language ?? ''))}</span>
      <span class="lang-level">${escHtml(String(item.level ?? ''))}</span>
    </div>
  `).join('')}</div>`
}

function renderLink(content: ContentMap): string {
  const items = Array.isArray(content.items) ? content.items as ContentMap[] : []
  if (!items.length) return '<p style="color:#94a3b8;font-size:9pt;">(موردی وارد نشده)</p>'
  return `<div class="link-items">${items.map(item => `
    <div class="link-item">
      <a href="${escHtml(String(item.url ?? ''))}" target="_blank">${escHtml(String(item.label ?? item.url ?? ''))}</a>
    </div>
  `).join('')}</div>`
}

function renderText(content: ContentMap): string {
  const text = typeof content.text === 'string' ? content.text : ''
  if (!text) return '<p style="color:#94a3b8;font-size:9pt;">(متنی وارد نشده)</p>'
  return `<p class="summary-text">${escHtml(text)}</p>`
}

function renderSectionContent(section: ResumeSectionDto): string {
  const content = section.content as ContentMap
  switch (section.type) {
    case 'SUMMARY': return renderSummary(content)
    case 'EXPERIENCE': return renderExperience(content)
    case 'EDUCATION': return renderEducation(content)
    case 'PROJECT': return renderProject(content)
    case 'SKILL': return renderSkill(content)
    case 'CERTIFICATE': return renderCertificate(content)
    case 'LANGUAGE': return renderLanguage(content)
    case 'LINK': return renderLink(content)
    default: return renderText(content)
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDateRange(start: string, end: string, isCurrent: boolean): string {
  if (!start && !end) return ''
  const endStr = isCurrent ? 'اکنون' : end
  if (!start) return endStr
  if (!endStr) return start
  return `${start} — ${endStr}`
}

// ── Build full HTML document ──────────────────────────────────────────────

function buildResumeHtml(
  resume: ResumeDocumentDto,
  sections: ResumeSectionDto[],
): string {
  const visibleSections = sections.filter((s) => s.isVisible !== false).sort((a, b) => a.sortOrder - b.sortOrder)

  const displayName = (resume as unknown as Record<string, unknown>).ownerName as string | undefined
    ?? 'نام کامل'

  const sectionsHtml = visibleSections
    .map((section) => `
      <div class="section">
        <div class="section-title">${escHtml(section.title)}</div>
        ${renderSectionContent(section)}
      </div>
    `)
    .join('')

  const isEN = resume.language === 'EN'
  const htmlLang = isEN ? 'en' : 'fa'
  const htmlDir = isEN ? 'ltr' : 'rtl'

  return `<!DOCTYPE html>
<html lang="${htmlLang}" dir="${htmlDir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(resume.title)}</title>
  <style>${buildPreviewStyles(resume)}</style>
</head>
<body>
  <div class="page">
    <div class="content">
      <div class="resume-header">
        <div class="resume-name">${escHtml(displayName)}</div>
        ${resume.targetRole ? `<div class="resume-title">${escHtml(resume.targetRole)}</div>` : ''}
      </div>
      ${sectionsHtml}
    </div>
  </div>
</body>
</html>`
}

// ── Component ─────────────────────────────────────────────────────────────

export function ResumePreviewPanel({ resume, sections, template }: ResumePreviewPanelProps) {
  const html = buildResumeHtml(resume, sections)

  // Blob URL must be created client-side only (after hydration) to avoid SSR mismatch.
  // Also revoked on cleanup to prevent memory leaks.
  const [blob, setBlob] = useState<string | null>(null)
  useEffect(() => {
    const b = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
    setBlob(b)
    return () => URL.revokeObjectURL(b)
  }, [html])

  const style = resume.styleConfig as Record<string, unknown> | null | undefined
  const accentColor = typeof style?.accentColor === 'string' ? style.accentColor : '#1e293b'
  const templateName = template?.title ?? 'بدون قالب'

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-subtle)]">
      {/* Preview header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">پیش‌نمایش</span>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
            style={{ background: accentColor + '12', color: accentColor, borderColor: accentColor + '30' }}>
            {templateName}
          </span>
          {resume.includeWatermark && (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              واترمارک
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--color-text-muted)]">A4</span>
          {/* Print-friendly open */}
          {blob && (
            <a
              href={blob}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--color-brand-600)] hover:underline"
            >
              باز کردن ↗
            </a>
          )}
        </div>
      </div>

      {/* A4 iframe preview — scaled to fit panel */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        <div
          className="w-full"
          style={{
            maxWidth: '420px',
            background: 'white',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            borderRadius: '4px',
            overflow: 'hidden',
            aspectRatio: '210 / 297',
          }}
        >
          <iframe
            srcDoc={html}
            title="پیش‌نمایش رزومه"
            sandbox="allow-same-origin"
            style={{
              width: '794px',
              height: '1123px',
              border: 'none',
              transformOrigin: 'top right',
              display: 'block',
            }}
            // Scale down to fit the container using CSS transform
            className="resume-preview-iframe"
          />
        </div>
        <style>{`
          .resume-preview-iframe {
            transform: scale(0.53);
            transform-origin: top right;
            width: 794px;
            height: 1123px;
          }
          @media (min-width: 1280px) {
            .resume-preview-iframe {
              transform: scale(0.53);
            }
          }
        `}</style>
      </div>
    </div>
  )
}
