'use client'

import { useState, useCallback, useEffect } from 'react'
import type { ResumeSectionDto, ResumeDocumentDto, ResumeTemplateDto } from '@irno/types'
import { ResumeSectionType } from '@irno/types'
import { fa } from '@irno/i18n'
import { SectionContentEditor } from './SectionContentEditor'
import { ResumePreviewPanel } from './ResumePreviewPanel'

// ── Types ──────────────────────────────────────────────────────────────────

interface ResumeEditorWorkspaceProps {
  resume: ResumeDocumentDto
  initialSections: ResumeSectionDto[]
  templates: ResumeTemplateDto[]
}

type ActivePanel = 'structure' | 'edit' | 'design' | 'preview' | 'export'

// ── Default content per section type ──────────────────────────────────────

function createDefaultContent(type: string): Record<string, unknown> {
  switch (type) {
    case 'SUMMARY':
    case 'TEXT_BLOCK':
    case 'CUSTOM':
      return { text: '' }
    case 'EXPERIENCE':
      return {
        items: [{
          role: '', company: '', location: '', startDate: '', endDate: '',
          isCurrent: false, description: '', achievements: [], technologies: [],
        }],
      }
    case 'EDUCATION':
      return { items: [{ institution: '', degree: '', field: '', startDate: '', endDate: '', gpa: '' }] }
    case 'PROJECT':
      return { items: [{ title: '', role: '', description: '', technologies: [], demoUrl: '', repoUrl: '', features: [] }] }
    case 'SKILL':
      return { groups: [{ name: 'مهارت‌های فنی', skills: [] }] }
    case 'CERTIFICATE':
      return { items: [{ title: '', issuer: '', issuedAt: '', verificationUrl: '' }] }
    case 'LANGUAGE':
      return { items: [{ language: 'فارسی', level: 'زبان مادری' }] }
    case 'LINK':
      return { items: [{ label: '', url: '' }] }
    default:
      return { text: '' }
  }
}

const SECTION_TYPE_COLORS: Record<string, string> = {
  SUMMARY: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  EXPERIENCE: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  EDUCATION: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  PROJECT: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  SKILL: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  CERTIFICATE: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
  COURSE: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
  LANGUAGE: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800',
  LINK: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700',
  CUSTOM: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700',
  TEXT_BLOCK: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700',
}

const SECTION_TYPE_ICONS: Record<string, string> = {
  SUMMARY: '✦', EXPERIENCE: '💼', EDUCATION: '🎓', PROJECT: '🚀',
  SKILL: '⚡', CERTIFICATE: '🏆', LANGUAGE: '🌐', LINK: '🔗',
  TEXT_BLOCK: '📝', CUSTOM: '✏️', COURSE: '📚',
}

// ── Quick-add section types for empty state ────────────────────────────────

const QUICK_ADD_TYPES = [
  { type: 'SUMMARY', label: 'خلاصه حرفه‌ای', icon: '✦' },
  { type: 'EXPERIENCE', label: 'سابقه کاری', icon: '💼' },
  { type: 'SKILL', label: 'مهارت‌ها', icon: '⚡' },
  { type: 'PROJECT', label: 'پروژه‌ها', icon: '🚀' },
  { type: 'EDUCATION', label: 'تحصیلات', icon: '🎓' },
]

// ── Main workspace ─────────────────────────────────────────────────────────

export function ResumeEditorWorkspace({ resume: initialResume, initialSections, templates }: ResumeEditorWorkspaceProps) {
  const [resume, setResume] = useState<ResumeDocumentDto>(initialResume)
  const [sections, setSections] = useState<ResumeSectionDto[]>(initialSections)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(initialSections[0]?.id ?? null)
  const [activePanel, setActivePanel] = useState<ActivePanel>('structure')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSectionType, setNewSectionType] = useState<string>(ResumeSectionType.EXPERIENCE)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameTitle, setRenameTitle] = useState('')

  const API = `/api/v1/career/resumes/${resume.id}`
  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? null

  // When on desktop (structure panel is always visible in sidebar), default to 'edit'
  // active panel so the center panel shows something useful.
  // We keep 'structure' as the default for mobile.

  // ── Section CRUD ───────────────────────────────────────────────────────

  const updateSectionContent = useCallback(async (sectionId: string, content: Record<string, unknown>) => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`${API}/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        const data = await res.json()
        const updated: ResumeSectionDto = data?.data ?? data
        setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...updated } : s)))
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    }
  }, [API])

  async function toggleVisible(section: ResumeSectionDto) {
    const res = await fetch(`${API}/sections/${section.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: !section.isVisible }),
    })
    if (res.ok) {
      setSections((prev) =>
        prev.map((s) => (s.id === section.id ? { ...s, isVisible: !s.isVisible } : s))
      )
    }
  }

  async function deleteSection(id: string) {
    if (!confirm('این بخش حذف شود؟')) return
    const res = await fetch(`${API}/sections/${id}`, { method: 'DELETE' })
    if (res.ok) {
      const remaining = sections.filter((s) => s.id !== id)
      setSections(remaining)
      if (selectedSectionId === id) {
        setSelectedSectionId(remaining[0]?.id ?? null)
      }
    }
  }

  async function duplicateSection(sectionId: string) {
    const source = sections.find((s) => s.id === sectionId)
    if (!source) return
    setSaveStatus('saving')
    try {
      const res = await fetch(`${API}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: source.type,
          title: `${source.title} (کپی)`,
          content: source.content,
          sortOrder: source.sortOrder + 1,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const newSection: ResumeSectionDto = data?.data ?? data
        setSections((prev) => {
          const idx = prev.findIndex((s) => s.id === sectionId)
          const next = [...prev]
          next.splice(idx + 1, 0, newSection)
          return next
        })
        setSelectedSectionId(newSection.id)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    }
  }

  async function moveSection(id: string, direction: 'up' | 'down') {
    const idx = sections.findIndex((s) => s.id === id)
    if (idx < 0) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === sections.length - 1) return

    const newSections = [...sections]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newSections[idx], newSections[swapIdx]] = [newSections[swapIdx]!, newSections[idx]!]
    setSections(newSections)

    await fetch(`${API}/sections/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionIds: newSections.map((s) => s.id) }),
    })
  }

  async function quickAddSection(type: string, label: string) {
    const content = createDefaultContent(type)
    setAddLoading(true)
    try {
      const res = await fetch(`${API}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title: label, content }),
      })
      if (res.ok) {
        const data = await res.json()
        const section: ResumeSectionDto = data?.data ?? data
        setSections((prev) => [...prev, section])
        setSelectedSectionId(section.id)
        setActivePanel('edit')
      }
    } finally {
      setAddLoading(false)
    }
  }

  async function handleAddSection() {
    if (!newSectionTitle.trim()) {
      setAddError('عنوان الزامی است.')
      return
    }
    setAddError(null)
    setAddLoading(true)
    try {
      const content = createDefaultContent(newSectionType)
      const res = await fetch(`${API}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newSectionType, title: newSectionTitle.trim(), content }),
      })
      if (res.ok) {
        const data = await res.json()
        const section: ResumeSectionDto = data?.data ?? data
        setSections((prev) => [...prev, section])  // APPEND, not replace
        setSelectedSectionId(section.id)
        setShowAddModal(false)
        setNewSectionTitle('')
        setNewSectionType(ResumeSectionType.EXPERIENCE)
        setActivePanel('edit')
      } else {
        const data = await res.json().catch(() => ({}))
        setAddError((data as any)?.message ?? 'خطا در افزودن بخش.')
      }
    } catch {
      setAddError('خطا در اتصال.')
    } finally {
      setAddLoading(false)
    }
  }

  async function saveRename(id: string) {
    if (!renameTitle.trim()) return
    const res = await fetch(`${API}/sections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: renameTitle.trim() }),
    })
    if (res.ok) {
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title: renameTitle.trim() } : s)))
    }
    setRenameId(null)
    setRenameTitle('')
  }

  async function importFromIrno() {
    setImportLoading(true)
    setImportResult(null)
    try {
      const res = await fetch(`${API}/import-irno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importSkills: true, importCertificates: true, importCourses: true, importCredits: true }),
      })
      if (res.ok) {
        const data = await res.json()
        const result = data?.data ?? data
        const count = typeof result.sectionsCreated === 'number' ? result.sectionsCreated : 0
        setImportResult(`${count} بخش از ایرنو وارد شد.`)
        const sectionsRes = await fetch(`${API}/sections`)
        if (sectionsRes.ok) {
          const sd = await sectionsRes.json()
          setSections(sd?.data ?? sd ?? [])
        }
      } else {
        setImportResult('خطا در وارد کردن داده‌های ایرنو.')
      }
    } catch {
      setImportResult('خطا در اتصال.')
    } finally {
      setImportLoading(false)
    }
  }

  // ── ATS guidance ──────────────────────────────────────────────────────────

  function getAtsGuidance(section: ResumeSectionDto): string | null {
    const c = section.content
    if (section.type === 'SKILL') {
      const groups = Array.isArray(c.groups) ? c.groups as { name: string; skills: string[] }[] : []
      if (groups.length === 0 || groups.every(g => g.skills.length === 0)) return 'بخش مهارت‌ها خالی است. مهارت‌های کلیدی خود را اضافه کنید.'
    }
    if (section.type === 'SUMMARY') {
      const text = typeof c.text === 'string' ? c.text : ''
      if (text.length < 50) return 'خلاصه حرفه‌ای خیلی کوتاه است. حداقل ۳-۴ جمله بنویسید.'
      if (text.length > 600) return 'خلاصه حرفه‌ای خیلی طولانی است. بین ۱۰۰ تا ۴۰۰ کاراکتر ایده‌آل است.'
    }
    if (section.type === 'EXPERIENCE') {
      const items = Array.isArray(c.items) ? c.items as { achievements?: string[] }[] : []
      if (items.some(it => !it.achievements || it.achievements.length < 2)) {
        return 'برای هر موقعیت شغلی حداقل ۳-۵ دستاورد قابل اندازه‌گیری اضافه کنید.'
      }
    }
    return null
  }

  // ── Default new section title ──────────────────────────────────────────────

  useEffect(() => {
    const defaults: Record<string, string> = {
      SUMMARY: 'خلاصه حرفه‌ای', EXPERIENCE: 'سوابق کاری', EDUCATION: 'تحصیلات',
      PROJECT: 'پروژه‌ها', SKILL: 'مهارت‌ها', CERTIFICATE: 'مدارک و گواهی‌نامه‌ها',
      LANGUAGE: 'زبان‌ها', LINK: 'لینک‌ها', TEXT_BLOCK: 'بخش متنی', CUSTOM: 'بخش دلخواه',
    }
    setNewSectionTitle(defaults[newSectionType] ?? '')
  }, [newSectionType])

  // ── Active center panel on desktop (edit/design/export only; structure shows in sidebar) ───

  // On desktop the sidebar always shows the section outline (structure).
  // The center area cycles between edit/design/export via its own tab bar.
  // On mobile, all 5 tabs are in the topbar.
  const desktopCenterPanels: { id: ActivePanel; label: string }[] = [
    { id: 'edit', label: 'ویرایش' },
    { id: 'design', label: 'طراحی' },
    { id: 'export', label: 'خروجی' },
  ]
  const mobilePanels: { id: ActivePanel; label: string }[] = [
    { id: 'structure', label: 'ساختار' },
    { id: 'edit', label: 'ویرایش' },
    { id: 'design', label: 'طراحی' },
    { id: 'preview', label: 'پیش‌نمایش' },
    { id: 'export', label: 'خروجی' },
  ]

  // Determine what the center panel shows on desktop:
  // 'structure' or 'preview' don't apply to the center panel (they're sidebar/right)
  // so treat them as 'edit' on desktop.
  const desktopCenterActive: ActivePanel =
    activePanel === 'edit' || activePanel === 'design' || activePanel === 'export'
      ? activePanel
      : 'edit'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* ── Top product header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] sticky top-0 z-20 shadow-sm">
        {/* Left: breadcrumb */}
        <div className="flex items-center gap-2.5 min-w-0">
          <a
            href="/resumes"
            className="shrink-0 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-brand-600)] transition-colors"
          >
            <IconArrowRight />
            <span className="hidden sm:inline">رزومه‌ها</span>
          </a>
          <span className="shrink-0 text-[var(--color-border)]">/</span>
          <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate max-w-[180px] sm:max-w-xs">
            {resume.title}
          </span>
          {resume.templateId && templates.find(t => t.id === resume.templateId) && (
            <span className="hidden md:inline-flex items-center rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
              {templates.find(t => t.id === resume.templateId)?.title}
            </span>
          )}
        </div>

        {/* Center: mobile tabs */}
        <div className="flex lg:hidden gap-0.5 rounded-lg bg-[var(--color-bg-subtle)] p-0.5">
          {mobilePanels.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePanel(p.id)}
              className={[
                'rounded-md px-2 py-1 text-xs transition-colors',
                activePanel === p.id
                  ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm font-medium'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Right: save status + export shortcut */}
        <div className="flex items-center gap-2 shrink-0">
          {saveStatus === 'saving' && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-pulse" />
              ذخیره...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-[var(--color-success)]">
              <span>✓</span> ذخیره شد
            </span>
          )}
          {saveStatus === 'error' && (
            <button
              onClick={() => setSaveStatus('idle')}
              className="hidden sm:flex items-center gap-1 text-xs text-[var(--color-danger)] hover:underline"
            >
              ⚠ خطا در ذخیره — تلاش مجدد
            </button>
          )}
          <a
            href={`/checker?resumeId=${resume.id}&tab=irno`}
            className="hidden md:flex items-center gap-1.5 rounded-lg border border-[var(--color-brand-400)] bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)]/20 hover:bg-[var(--color-brand-100)] dark:hover:bg-[var(--color-brand-900)]/40 px-3 py-1.5 text-xs font-medium text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)] transition-colors"
          >
            <span>✓</span>
            بررسی
          </a>
          <button
            onClick={() => setActivePanel('export')}
            className="hidden md:flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors"
          >
            <IconDownload />
            خروجی
          </button>
        </div>
      </div>

      {/* ── 3-panel layout ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL: Section Outline (desktop always, mobile structure tab) ── */}
        <div className={[
          'shrink-0 border-l border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex flex-col overflow-hidden',
          // Desktop: always visible, 256px
          'hidden lg:flex lg:w-64',
        ].join(' ')}>
          <SectionOutlinePanel
            resume={resume}
            sections={sections}
            selectedSectionId={selectedSectionId}
            onSelect={(id) => { setSelectedSectionId(id); setActivePanel('edit') }}
            onToggleVisible={toggleVisible}
            onDelete={deleteSection}
            onDuplicate={duplicateSection}
            onMove={moveSection}
            onAdd={() => setShowAddModal(true)}
            onQuickAdd={quickAddSection}
            onImport={importFromIrno}
            onRenameStart={(id, title) => { setRenameId(id); setRenameTitle(title) }}
            renameId={renameId}
            renameTitle={renameTitle}
            onRenameChange={setRenameTitle}
            onRenameSave={saveRename}
            onRenameCancel={() => { setRenameId(null); setRenameTitle('') }}
            importLoading={importLoading}
            importResult={importResult}
            onClearImportResult={() => setImportResult(null)}
            addLoading={addLoading}
          />
        </div>

        {/* ── CENTER PANEL ──────────────────────────────────────────────────── */}
        {/* On mobile: show for all tabs except 'preview' (preview is right panel) */}
        {/* On desktop: always flex */}
        <div className={[
          'flex-1 flex flex-col overflow-hidden',
          activePanel !== 'preview' ? 'flex' : 'hidden',
          'lg:flex',
        ].join(' ')}>

          {/* Mobile structure outline */}
          <div className={[
            'lg:hidden flex-col flex-1 overflow-y-auto',
            activePanel === 'structure' ? 'flex' : 'hidden',
          ].join(' ')}>
            <SectionOutlinePanel
              resume={resume}
              sections={sections}
              selectedSectionId={selectedSectionId}
              onSelect={(id) => { setSelectedSectionId(id); setActivePanel('edit') }}
              onToggleVisible={toggleVisible}
              onDelete={deleteSection}
              onDuplicate={duplicateSection}
              onMove={moveSection}
              onAdd={() => setShowAddModal(true)}
              onQuickAdd={quickAddSection}
              onImport={importFromIrno}
              onRenameStart={(id, title) => { setRenameId(id); setRenameTitle(title) }}
              renameId={renameId}
              renameTitle={renameTitle}
              onRenameChange={setRenameTitle}
              onRenameSave={saveRename}
              onRenameCancel={() => { setRenameId(null); setRenameTitle('') }}
              importLoading={importLoading}
              importResult={importResult}
              onClearImportResult={() => setImportResult(null)}
              addLoading={addLoading}
              mobileLayout
            />
          </div>

          {/* Desktop center panel tab bar: Edit | Design | Export */}
          <div className="hidden lg:flex items-center gap-0.5 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1.5">
            {desktopCenterPanels.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={[
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  desktopCenterActive === tab.id
                    ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)]/40 dark:text-[var(--color-brand-300)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Edit panel — visible when edit tab (or structure on desktop which defaults to edit) */}
          <div className={[
            'flex-col flex-1 overflow-hidden',
            // Mobile: show when 'edit' tab
            // Desktop: show when desktopCenterActive === 'edit'
            (activePanel === 'edit' || (activePanel === 'structure' && desktopCenterActive === 'edit'))
              ? 'flex' : 'hidden',
            desktopCenterActive === 'edit' ? 'lg:flex' : 'lg:hidden',
          ].join(' ')}>
            {selectedSection ? (
              <div className="flex flex-col flex-1 overflow-y-auto">
                {/* Section header */}
                <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-5 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${SECTION_TYPE_COLORS[selectedSection.type] ?? SECTION_TYPE_COLORS.CUSTOM}`}>
                    <span>{SECTION_TYPE_ICONS[selectedSection.type] ?? '✏️'}</span>
                    {fa.resumeSectionType[selectedSection.type as keyof typeof fa.resumeSectionType] ?? selectedSection.type}
                  </span>
                  <span className="font-semibold text-sm text-[var(--color-text-primary)]">{selectedSection.title}</span>
                  {!selectedSection.isVisible && (
                    <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-full px-2 py-0.5">
                      پنهان
                    </span>
                  )}
                </div>

                {/* ATS guidance */}
                {(() => {
                  const guidance = getAtsGuidance(selectedSection)
                  return guidance ? (
                    <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                      <span className="shrink-0 mt-0.5">💡</span>
                      <span>{guidance}</span>
                    </div>
                  ) : null
                })()}

                <div className="p-5">
                  <SectionContentEditor
                    section={selectedSection}
                    onSave={updateSectionContent}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <div className="text-4xl mb-4">✏️</div>
                <div className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">بخشی انتخاب نشده</div>
                <p className="text-xs text-[var(--color-text-muted)] mb-4 max-w-xs">از پنل بخش‌ها یک بخش انتخاب کنید یا بخش جدید بسازید.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] rounded-lg px-4 py-2 text-sm transition-colors"
                >
                  + افزودن اولین بخش
                </button>
              </div>
            )}
          </div>

          {/* Design panel */}
          <div className={[
            'flex-col flex-1 overflow-y-auto p-5',
            activePanel === 'design' ? 'flex' : 'hidden',
            desktopCenterActive === 'design' ? 'lg:flex' : 'lg:hidden',
          ].join(' ')}>
            <DesignPanel resume={resume} templates={templates} onResumeUpdate={setResume} />
          </div>

          {/* Export panel */}
          <div className={[
            'flex-col flex-1 overflow-y-auto p-5',
            activePanel === 'export' ? 'flex' : 'hidden',
            desktopCenterActive === 'export' ? 'lg:flex' : 'lg:hidden',
          ].join(' ')}>
            <ExportPanel resume={resume} sections={sections} />
          </div>
        </div>

        {/* ── RIGHT PANEL: Live preview ──────────────────────────────────── */}
        <div className={[
          'shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-subtle)] flex flex-col overflow-hidden',
          'hidden lg:flex lg:w-[400px]',
          activePanel === 'preview' ? '!flex flex-1' : '',
        ].join(' ')}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">پیش‌نمایش</span>
            <div className="flex items-center gap-2">
              {resume.includeWatermark !== false && (
                <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-full px-2 py-0.5">
                  🔖 واترمارک
                </span>
              )}
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {resume.language === 'EN' ? 'EN' : 'FA'}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ResumePreviewPanel
              resume={resume}
              sections={sections}
              template={templates.find((t) => t.id === resume.templateId) ?? templates[0] ?? null}
            />
          </div>
        </div>
      </div>

      {/* ── Add section modal ──────────────────────────────────────────────── */}
      {showAddModal && (
        <AddSectionModal
          newSectionType={newSectionType}
          newSectionTitle={newSectionTitle}
          addLoading={addLoading}
          addError={addError}
          onTypeChange={setNewSectionType}
          onTitleChange={setNewSectionTitle}
          onConfirm={handleAddSection}
          onClose={() => { setShowAddModal(false); setAddError(null) }}
        />
      )}
    </div>
  )
}

// ── Section Outline Panel ──────────────────────────────────────────────────

interface SectionOutlinePanelProps {
  resume: ResumeDocumentDto
  sections: ResumeSectionDto[]
  selectedSectionId: string | null
  onSelect: (id: string) => void
  onToggleVisible: (s: ResumeSectionDto) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onMove: (id: string, dir: 'up' | 'down') => void
  onAdd: () => void
  onQuickAdd: (type: string, label: string) => void
  onImport: () => void
  onRenameStart: (id: string, title: string) => void
  renameId: string | null
  renameTitle: string
  onRenameChange: (v: string) => void
  onRenameSave: (id: string) => void
  onRenameCancel: () => void
  importLoading: boolean
  importResult: string | null
  onClearImportResult: () => void
  addLoading: boolean
  mobileLayout?: boolean
}

function SectionOutlinePanel({
  resume, sections, selectedSectionId, onSelect, onToggleVisible, onDelete, onDuplicate,
  onMove, onAdd, onQuickAdd, onImport, onRenameStart, renameId, renameTitle,
  onRenameChange, onRenameSave, onRenameCancel, importLoading, importResult,
  onClearImportResult, addLoading, mobileLayout,
}: SectionOutlinePanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
        <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">بخش‌ها</span>
        <div className="flex gap-1">
          <button
            onClick={onAdd}
            className="rounded-md p-1.5 text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] dark:hover:bg-[var(--color-brand-900)]/30 transition-colors"
            title="افزودن بخش"
          >
            <IconPlus />
          </button>
          <button
            onClick={onImport}
            disabled={importLoading}
            className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors disabled:opacity-50"
            title="وارد کردن از ایرنو"
          >
            <IconImport />
          </button>
        </div>
      </div>

      {/* Resume metadata */}
      <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]/50">
        <div className="text-xs font-semibold text-[var(--color-text-primary)] truncate mb-0.5">{resume.title}</div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-[var(--color-text-muted)]">{resume.language === 'EN' ? 'English' : 'فارسی'}</span>
          {resume.templateId && (
            <>
              <span className="text-[var(--color-border)]">·</span>
              <span className="text-[10px] text-[var(--color-text-muted)] truncate">{resume.templateId}</span>
            </>
          )}
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div className="mx-3 my-2 flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
          <span>{importResult}</span>
          <button onClick={onClearImportResult} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mr-1">×</button>
        </div>
      )}

      {/* Section list */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {sections.length === 0 ? (
          /* Premium empty state */
          <div className={['flex flex-col', mobileLayout ? 'p-4' : 'py-6 px-3'].join(' ')}>
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-1">هنوز بخشی ندارید</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">برای شروع یکی از بخش‌های پیشنهادی را انتخاب کنید</div>
            </div>
            <div className="space-y-1.5">
              {QUICK_ADD_TYPES.map(({ type, label, icon }) => (
                <button
                  key={type}
                  onClick={() => onQuickAdd(type, label)}
                  disabled={addLoading}
                  className="w-full flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-brand-400)] hover:bg-[var(--color-brand-50)] dark:hover:bg-[var(--color-brand-900)]/20 px-3 py-2 text-xs text-right transition-colors disabled:opacity-50"
                >
                  <span>{icon}</span>
                  <span className="text-[var(--color-text-secondary)]">افزودن {label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={onAdd}
              className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)] transition-colors"
            >
              <IconPlus />
              بخش دلخواه
            </button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {sections.map((section, idx) => (
              <div key={section.id}>
                {renameId === section.id ? (
                  <div className="flex gap-1 px-1 py-1">
                    <input
                      autoFocus
                      value={renameTitle}
                      onChange={(e) => onRenameChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onRenameSave(section.id)
                        if (e.key === 'Escape') onRenameCancel()
                      }}
                      className="flex-1 rounded border border-[var(--color-brand-400)] bg-[var(--color-bg-subtle)] px-2 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none"
                    />
                    <button onClick={() => onRenameSave(section.id)} className="text-[var(--color-success)] text-xs px-1">✓</button>
                    <button onClick={onRenameCancel} className="text-[var(--color-text-muted)] text-xs px-1">✕</button>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(section.id)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelect(section.id)}
                    className={[
                      'w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-right transition-colors group relative cursor-pointer',
                      selectedSectionId === section.id
                        ? 'bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)]/30 ring-1 ring-[var(--color-brand-200)] dark:ring-[var(--color-brand-800)]'
                        : 'hover:bg-[var(--color-bg-subtle)]',
                      !section.isVisible ? 'opacity-40' : '',
                    ].join(' ')}
                  >
                    {/* Type badge */}
                    <span className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${SECTION_TYPE_COLORS[section.type] ?? SECTION_TYPE_COLORS.CUSTOM}`}>
                      {SECTION_TYPE_ICONS[section.type] ?? '✏️'}
                    </span>
                    {/* Title */}
                    <span className={[
                      'flex-1 text-xs truncate text-right',
                      selectedSectionId === section.id
                        ? 'font-semibold text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)]'
                        : 'text-[var(--color-text-secondary)]',
                    ].join(' ')}>
                      {section.title}
                    </span>
                    {/* Actions — visible on hover / selected */}
                    <div className={[
                      'flex items-center gap-0.5 shrink-0 transition-opacity',
                      selectedSectionId === section.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    ].join(' ')}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onMove(section.id, 'up') }}
                        disabled={idx === 0}
                        className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-20 transition-colors rounded"
                        title="بالا"
                      ><IconChevronUp /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onMove(section.id, 'down') }}
                        disabled={idx === sections.length - 1}
                        className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-20 transition-colors rounded"
                        title="پایین"
                      ><IconChevronDown /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleVisible(section) }}
                        className={`p-0.5 rounded transition-colors ${section.isVisible ? 'text-[var(--color-brand-500)]' : 'text-[var(--color-text-muted)]'}`}
                        title={section.isVisible ? 'پنهان' : 'نمایش'}
                      >{section.isVisible ? <IconEye /> : <IconEyeOff />}</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRenameStart(section.id, section.title) }}
                        className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors rounded"
                        title="تغییر نام"
                      ><IconPencil /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDuplicate(section.id) }}
                        className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-brand-600)] transition-colors rounded"
                        title="کپی"
                      ><IconCopy /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(section.id) }}
                        className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors rounded"
                        title="حذف"
                      ><IconTrash /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add section button */}
      {sections.length > 0 && (
        <div className="border-t border-[var(--color-border)] p-3">
          <button
            onClick={onAdd}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] dark:hover:bg-[var(--color-brand-900)]/20 transition-colors"
          >
            <IconPlus />
            افزودن بخش جدید
          </button>
        </div>
      )}
    </div>
  )
}

// ── Add Section Modal ──────────────────────────────────────────────────────

function AddSectionModal({
  newSectionType, newSectionTitle, addLoading, addError,
  onTypeChange, onTitleChange, onConfirm, onClose,
}: {
  newSectionType: string
  newSectionTitle: string
  addLoading: boolean
  addError: string | null
  onTypeChange: (t: string) => void
  onTitleChange: (t: string) => void
  onConfirm: () => void
  onClose: () => void
}) {
  const SECTION_TYPES = [
    { type: 'SUMMARY', label: 'خلاصه', icon: '✦' },
    { type: 'EXPERIENCE', label: 'سابقه کاری', icon: '💼' },
    { type: 'EDUCATION', label: 'تحصیلات', icon: '🎓' },
    { type: 'SKILL', label: 'مهارت‌ها', icon: '⚡' },
    { type: 'PROJECT', label: 'پروژه‌ها', icon: '🚀' },
    { type: 'CERTIFICATE', label: 'مدارک', icon: '🏆' },
    { type: 'LANGUAGE', label: 'زبان‌ها', icon: '🌐' },
    { type: 'LINK', label: 'لینک‌ها', icon: '🔗' },
    { type: 'TEXT_BLOCK', label: 'متن آزاد', icon: '📝' },
    { type: 'CUSTOM', label: 'دلخواه', icon: '✏️' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">افزودن بخش جدید</h3>
          <button onClick={onClose} className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] transition-colors">
            <IconX />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {addError && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-3 py-2 text-xs text-[var(--color-danger)]">
              {addError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">نوع بخش</label>
            <div className="grid grid-cols-2 gap-1.5">
              {SECTION_TYPES.map(({ type, label, icon }) => (
                <button
                  key={type}
                  onClick={() => onTypeChange(type)}
                  className={[
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-right transition-colors',
                    newSectionType === type
                      ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)]/30 dark:text-[var(--color-brand-300)] font-medium'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]',
                  ].join(' ')}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">عنوان بخش</label>
            <input
              type="text"
              value={newSectionTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
              placeholder="عنوان این بخش..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onConfirm}
            disabled={addLoading}
            className="flex-1 bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {addLoading ? 'در حال افزودن...' : '+ افزودن بخش'}
          </button>
          <button
            onClick={onClose}
            className="border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Design panel ───────────────────────────────────────────────────────────

function DesignPanel({
  resume, templates, onResumeUpdate,
}: {
  resume: ResumeDocumentDto
  templates: ResumeTemplateDto[]
  onResumeUpdate: (r: ResumeDocumentDto) => void
}) {
  const style = (resume.styleConfig as Record<string, unknown>) ?? {}
  const [accentColor, setAccentColor] = useState<string>((style.accentColor as string) ?? '#4f46e5')
  const [fontSize, setFontSize] = useState<string>(String(style.fontSize ?? '11'))
  const [spacing, setSpacing] = useState<string>((style.spacing as string) ?? 'normal')
  const [includeWatermark, setIncludeWatermark] = useState<boolean>(resume.includeWatermark !== false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  async function applyTemplate(templateId: string) {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/v1/career/resumes/${resume.id}/template`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })
      if (res.ok) {
        const data = await res.json()
        onResumeUpdate(data?.data ?? data)
      } else {
        const err = await res.json().catch(() => ({}))
        setSaveError((err as any)?.message ?? `خطا در تغییر قالب (${res.status})`)
      }
    } catch {
      setSaveError('خطا در اتصال.')
    } finally {
      setSaving(false)
    }
  }

  async function saveStyle() {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const [styleRes, watermarkRes] = await Promise.all([
        fetch(`/api/v1/career/resumes/${resume.id}/style`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accentColor, fontSize: parseInt(fontSize, 10), spacing }),
        }),
        fetch(`/api/v1/career/resumes/${resume.id}/watermark`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ includeWatermark }),
        }),
      ])

      if (styleRes.ok && watermarkRes.ok) {
        const styleData = await styleRes.json()
        onResumeUpdate({ ...(styleData?.data ?? styleData), includeWatermark })
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        const failed = !styleRes.ok ? styleRes : watermarkRes
        const errData = await failed.json().catch(() => ({}))
        setSaveError((errData as any)?.message ?? `خطا در ذخیره تنظیمات (${failed.status}) — لطفاً پس از اجرای pnpm db:generate دوباره تلاش کنید.`)
      }
    } catch {
      setSaveError('خطا در اتصال به سرور.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-sm">
      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-xs text-[var(--color-danger)]">
          <div className="font-semibold mb-1">خطا در ذخیره</div>
          <div className="leading-relaxed">{saveError}</div>
          <button onClick={() => setSaveError(null)} className="mt-2 text-[var(--color-danger)] underline">بستن</button>
        </div>
      )}
      {saveSuccess && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-xs text-green-700 dark:text-green-300 flex items-center gap-2">
          <span>✓</span> تنظیمات طراحی با موفقیت ذخیره شد.
        </div>
      )}

      {/* Template selector */}
      <div>
        <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">قالب رزومه</h2>
        {templates.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-6 text-center text-xs text-[var(--color-text-muted)]">
            هنوز قالبی موجود نیست.<br />پس از اجرای <code className="bg-[var(--color-bg-elevated)] px-1 rounded">pnpm db:seed</code> قالب‌ها بارگذاری می‌شوند.
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl.id)}
                disabled={saving}
                className={[
                  'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-right transition-colors disabled:opacity-60',
                  resume.templateId === tpl.id
                    ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)]/30'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-subtle)]',
                ].join(' ')}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">{tpl.title}</div>
                  {tpl.description && (
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{tpl.description}</div>
                  )}
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  {tpl.supportsAts && (
                    <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 px-1.5 py-0.5 text-[9px] font-bold">ATS</span>
                  )}
                  {tpl.isPremium && (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 px-1.5 py-0.5 text-[9px] font-bold">Pro</span>
                  )}
                </div>
                {resume.templateId === tpl.id && (
                  <div className="w-2 h-2 rounded-full bg-[var(--color-brand-500)] shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
        {templates.find(t => t.id === resume.templateId)?.supportsAts === false && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <span className="shrink-0">⚠️</span>
            <span>این قالب برای ATS بهینه نیست. برای درخواست‌های آنلاین، قالب ATS Friendly را انتخاب کنید.</span>
          </div>
        )}
      </div>

      {/* Style settings */}
      <div>
        <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">استایل</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">رنگ اصلی</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-9 h-9 rounded-lg cursor-pointer border border-[var(--color-border)] p-0.5 bg-transparent"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">اندازه متن</label>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
            >
              <option value="9">9pt — خیلی فشرده</option>
              <option value="10">10pt — فشرده</option>
              <option value="11">11pt — معمولی (پیشنهادی)</option>
              <option value="12">12pt — راحت</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">فاصله‌گذاری</label>
            <select
              value={spacing}
              onChange={(e) => setSpacing(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
            >
              <option value="compact">فشرده — اطلاعات بیشتر</option>
              <option value="normal">معمولی — تعادل مناسب</option>
              <option value="comfortable">راحت — خوانایی بیشتر</option>
            </select>
          </div>
        </div>
      </div>

      {/* Watermark toggle */}
      <div>
        <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">واترمارک</h2>
        <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3 hover:bg-[var(--color-bg-subtle)] transition-colors">
          <div className="relative inline-flex shrink-0">
            <input
              type="checkbox"
              checked={includeWatermark}
              onChange={(e) => setIncludeWatermark(e.target.checked)}
              className="sr-only"
            />
            <div className={['w-10 h-6 rounded-full transition-colors', includeWatermark ? 'bg-[var(--color-brand-600)]' : 'bg-[var(--color-border)]'].join(' ')}>
              <div className={['absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', includeWatermark ? 'right-1' : 'left-1'].join(' ')} />
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--color-text-primary)]">واترمارک ایرنو CV</div>
            <div className="text-xs text-[var(--color-text-muted)]">نمایش واترمارک مورب در خروجی رزومه</div>
          </div>
        </label>
      </div>

      <button
        onClick={saveStyle}
        disabled={saving}
        className="w-full bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
      >
        {saving ? 'در حال ذخیره...' : '✓ اعمال تغییرات طراحی'}
      </button>
    </div>
  )
}

// ── Export panel ───────────────────────────────────────────────────────────

type ExportHistoryItem = {
  id: string
  format: string
  status: 'PENDING' | 'GENERATED' | 'FAILED'
  errorMessage?: string | null
  createdAt: string
}

function ExportPanel({ resume, sections }: { resume: ResumeDocumentDto; sections: ResumeSectionDto[] }) {
  const [selectedFormat, setSelectedFormat] = useState<'HTML' | 'PDF'>('HTML')
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState<{ id: string; format: string } | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const visibleSections = sections.filter(s => s.isVisible)

  // Load export history on mount
  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true)
      try {
        const res = await fetch(`/api/v1/career/resumes/${resume.id}/exports`)
        if (res.ok) {
          const data = await res.json()
          const exports = data?.data?.data ?? data?.data ?? data ?? []
          setExportHistory(Array.isArray(exports) ? (exports as ExportHistoryItem[]).slice(0, 5) : [])
        }
      } catch {
        // Non-critical; ignore
      } finally {
        setHistoryLoading(false)
      }
    }
    loadHistory()
  }, [resume.id])

  async function triggerExport() {
    setExporting(true)
    setExportError(null)
    setExportResult(null)
    try {
      const res = await fetch(`/api/v1/career/resumes/${resume.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: selectedFormat,
          includeWatermark: resume.includeWatermark !== false,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const exportData = data?.data ?? data
        if (exportData?.id) {
          setExportResult({ id: exportData.id, format: exportData.format ?? selectedFormat })
          // Prepend to history
          setExportHistory(prev => [
            {
              id: exportData.id,
              format: exportData.format ?? selectedFormat,
              status: exportData.status ?? 'GENERATED',
              createdAt: new Date().toISOString(),
            },
            ...prev.slice(0, 4),
          ])
        }
      } else {
        // Map well-known HTTP status codes to Persian user messages
        let msg: string
        if (res.status === 429) {
          msg = 'در حال حاضر چند خروجی PDF در حال آماده‌سازی است. لطفاً چند لحظه دیگر دوباره تلاش کنید.'
        } else if (res.status === 503) {
          msg = 'خروجی PDF در حال حاضر غیرفعال است. لطفاً از خروجی HTML استفاده کنید.'
        } else if (res.status === 504) {
          msg = 'تولید PDF بیش از حد مجاز طول کشید. لطفاً دوباره تلاش کنید.'
        } else {
          const errData = await res.json().catch(() => ({}))
          msg = (errData as any)?.message ?? `خطا در ایجاد خروجی (${res.status})`
        }

        setExportError(msg)

        // If the server already created a FAILED record, add it to history so the user
        // can see the failure in the history list without a manual reload.
        // We don't have the ID from a failed response, so we just mark history stale.
        // History will refresh on next mount (panel re-open). This is acceptable for MVP.
      }
    } catch {
      setExportError('خطا در اتصال به سرور. اتصال اینترنت خود را بررسی کنید.')
    } finally {
      setExporting(false)
    }
  }

  const isPdf = selectedFormat === 'PDF'
  const buttonLabel = exporting
    ? isPdf ? '⏳ در حال تولید PDF (۵–۱۵ ثانیه)...' : '⏳ در حال ایجاد خروجی...'
    : sections.length === 0
      ? 'ابتدا بخشی اضافه کنید'
      : isPdf ? '⬇ دریافت PDF' : '⬇ دریافت HTML'

  const downloadUrl = exportResult
    ? `/api/v1/career/resumes/${resume.id}/exports/${exportResult.id}/download`
    : null

  return (
    <div className="space-y-5 max-w-sm">
      {/* Checker shortcut */}
      <div className="rounded-xl border border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)] bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)]/20 p-4 flex items-center gap-3">
        <div className="text-2xl shrink-0">📊</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--color-text-primary)] mb-0.5">بررسی کیفیت رزومه</div>
          <div className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            قبل از خروجی، کیفیت ATS، ساختار و کلیدواژه‌های رزومه را بررسی کنید.
          </div>
        </div>
        <a
          href={`/studio/checker?resumeId=${resume.id}&tab=irno`}
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap"
        >
          <span>✓</span>
          بررسی
        </a>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">خروجی رزومه</h2>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          رزومه را به صورت PDF واقعی یا HTML دانلود کنید.
        </p>
      </div>

      {/* Format selector */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
        <div className="flex divide-x divide-x-reverse divide-[var(--color-border)]">
          {(['HTML', 'PDF'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => { setSelectedFormat(fmt); setExportResult(null); setExportError(null) }}
              className={[
                'flex-1 py-3 text-sm font-semibold transition-colors',
                selectedFormat === fmt
                  ? 'bg-[var(--color-brand-600)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]',
              ].join(' ')}
            >
              {fmt === 'PDF' ? '📄 PDF' : '🌐 HTML'}
            </button>
          ))}
        </div>
        {/* Format description */}
        <div className="px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
          {isPdf
            ? 'PDF واقعی تولید‌شده توسط سرور — قابل پرینت مستقیم، متن انتخاب‌پذیر، A4'
            : 'HTML با CSS چاپی — مناسب برای ATS و ارسال آنلاین'}
        </div>
      </div>

      {/* Summary cards */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] divide-y divide-[var(--color-border)] overflow-hidden">
        <div className="flex justify-between items-center px-4 py-2.5 text-xs">
          <span className="text-[var(--color-text-muted)]">بخش‌های فعال</span>
          <span className="font-semibold text-[var(--color-text-primary)]">{visibleSections.length} از {sections.length}</span>
        </div>
        <div className="flex justify-between items-center px-4 py-2.5 text-xs">
          <span className="text-[var(--color-text-muted)]">زبان رزومه</span>
          <span className="font-semibold text-[var(--color-text-primary)]">{fa.resumeLanguage[resume.language]}</span>
        </div>
        <div className="flex justify-between items-center px-4 py-2.5 text-xs">
          <span className="text-[var(--color-text-muted)]">واترمارک</span>
          <span className={resume.includeWatermark !== false ? 'text-[var(--color-brand-600)] font-medium' : 'text-[var(--color-text-muted)]'}>
            {resume.includeWatermark !== false ? '🔖 فعال' : 'غیرفعال'}
          </span>
        </div>
        <div className="flex justify-between items-center px-4 py-2.5 text-xs">
          <span className="text-[var(--color-text-muted)]">فرمت انتخابی</span>
          <span className="font-semibold text-[var(--color-text-primary)]">{selectedFormat}</span>
        </div>
      </div>

      {/* Watermark notice */}
      {resume.includeWatermark !== false && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3 text-xs text-[var(--color-text-secondary)]">
          <span className="shrink-0 mt-0.5">🔖</span>
          <span>خروجی شامل واترمارک مورب «ایرنو CV» است. برای غیرفعال کردن، به تب طراحی بروید.</span>
        </div>
      )}

      {/* PDF hint */}
      {isPdf && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20 px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
          <span className="shrink-0 mt-0.5">ℹ</span>
          <span>تولید PDF ممکن است ۵ تا ۱۵ ثانیه طول بکشد. لطفاً صبر کنید.</span>
        </div>
      )}

      {/* Error */}
      {exportError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-xs text-[var(--color-danger)]">
          <div className="font-semibold mb-1">خطا در خروجی</div>
          <p>{exportError}</p>
          {isPdf && exportError.toLowerCase().includes('chromium') && (
            <p className="mt-1 opacity-75">نیاز به نصب Chromium: <code>npx playwright install chromium</code></p>
          )}
          {isPdf && (exportError.includes('چند لحظه') || exportError.includes('در صف')) && (
            <p className="mt-1 opacity-75">چند ثانیه صبر کنید و دوباره تلاش کنید.</p>
          )}
          <button onClick={() => setExportError(null)} className="block mt-2 underline">بستن</button>
        </div>
      )}

      {/* Success */}
      {downloadUrl && exportResult && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-xs text-green-800 dark:text-green-300">
          <div className="font-semibold mb-1">
            {exportResult.format === 'PDF' ? '✓ فایل PDF آماده شد' : '✓ خروجی HTML آماده است'}
          </div>
          <a href={downloadUrl} download className="underline font-medium">
            {exportResult.format === 'PDF' ? 'دانلود PDF ↓' : 'دانلود فایل HTML ↓'}
          </a>
        </div>
      )}

      {/* Export button */}
      <button
        onClick={triggerExport}
        disabled={exporting || sections.length === 0}
        className="w-full bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
      >
        {buttonLabel}
      </button>

      {/* Export history */}
      {(exportHistory.length > 0 || historyLoading) && (
        <div>
          <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">تاریخچه خروجی‌ها</h3>
          {historyLoading ? (
            <div className="text-xs text-[var(--color-text-muted)] text-center py-2">در حال بارگذاری...</div>
          ) : (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] divide-y divide-[var(--color-border)] overflow-hidden">
              {exportHistory.map((exp) => (
                <div key={exp.id} className="px-4 py-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--color-text-muted)] flex items-center gap-1.5">
                      <span className={[
                        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold',
                        exp.format === 'PDF'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                      ].join(' ')}>
                        {exp.format}
                      </span>
                      {new Date(exp.createdAt).toLocaleDateString('fa-IR')}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {exp.status === 'GENERATED' && (
                        <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 text-[10px] font-semibold">✓ آماده</span>
                      )}
                      {exp.status === 'PENDING' && (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 text-[10px] font-semibold">⏳ در صف</span>
                      )}
                      {exp.status === 'FAILED' && (
                        <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 text-[10px] font-semibold">✕ خطا</span>
                      )}
                      {exp.status === 'GENERATED' && (
                        <a
                          href={`/api/v1/career/resumes/${resume.id}/exports/${exp.id}/download`}
                          download
                          className="text-[var(--color-brand-600)] hover:underline font-medium"
                        >
                          دانلود
                        </a>
                      )}
                    </div>
                  </div>
                  {exp.status === 'FAILED' && exp.errorMessage && (
                    <p className="mt-1 text-red-600 dark:text-red-400 text-[10px]">{exp.errorMessage}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────

function IconPlus() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
}
function IconImport() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M8 2v8M5 7l3 3 3-3"/><path d="M3 12h10"/></svg>
}
function IconDownload() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M8 2v8M5 7l3 3 3-3"/><path d="M3 12h10"/></svg>
}
function IconX() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>
}
function IconArrowRight() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M10 3l5 5-5 5"/><line x1="1" y1="8" x2="15" y2="8"/></svg>
}
function IconChevronUp() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3"><path d="M3 10l5-5 5 5"/></svg>
}
function IconChevronDown() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3"><path d="M3 6l5 5 5-5"/></svg>
}
function IconEye() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M1 8s3-5.5 7-5.5S15 8 15 8s-3 5.5-7 5.5S1 8 1 8z"/><circle cx="8" cy="8" r="2"/></svg>
}
function IconEyeOff() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5"><line x1="2" y1="2" x2="14" y2="14"/><path d="M6.5 6.5a2 2 0 002.8 2.8"/><path d="M4 4.6A8 8 0 001 8s3 5.5 7 5.5a7 7 0 003.4-.9M11.9 11.9A8 8 0 0015 8s-3-5.5-7-5.5a7 7 0 00-2.1.3"/></svg>
}
function IconPencil() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>
}
function IconCopy() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5"><rect x="5" y="5" width="9" height="9" rx="1"/><path d="M2 11V3a1 1 0 011-1h8"/></svg>
}
function IconTrash() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5"><polyline points="2,4 14,4"/><path d="M5 4V2h6v2"/><path d="M6 7v5M10 7v5"/><path d="M3 4l1 10h8l1-10"/></svg>
}
