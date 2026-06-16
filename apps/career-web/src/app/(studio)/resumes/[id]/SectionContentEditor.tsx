'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ResumeSectionDto } from '@irno/types'

interface SectionContentEditorProps {
  section: ResumeSectionDto
  onSave: (sectionId: string, content: Record<string, unknown>) => Promise<void>
}

// ── Main dispatcher ────────────────────────────────────────────────────────

export function SectionContentEditor({ section, onSave }: SectionContentEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  switch (section.type) {
    case 'SUMMARY':
    case 'TEXT_BLOCK':
    case 'CUSTOM':
      return <SummaryEditor section={section} onSave={onSave} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    case 'EXPERIENCE':
      return <ExperienceEditor section={section} onSave={onSave} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    case 'EDUCATION':
      return <EducationEditor section={section} onSave={onSave} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    case 'PROJECT':
      return <ProjectEditor section={section} onSave={onSave} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    case 'SKILL':
      return <SkillEditor section={section} onSave={onSave} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    case 'CERTIFICATE':
      return <CertificateEditor section={section} onSave={onSave} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    case 'LANGUAGE':
      return <LanguageEditor section={section} onSave={onSave} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    case 'LINK':
      return <LinkEditor section={section} onSave={onSave} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    default:
      return <SummaryEditor section={section} onSave={onSave} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
  }
}

// ── Shared types ───────────────────────────────────────────────────────────

interface EditorProps {
  section: ResumeSectionDto
  onSave: (id: string, content: Record<string, unknown>) => Promise<void>
  showAdvanced: boolean
  setShowAdvanced: (v: boolean) => void
}

// ── Shared footer with save button + advanced toggle ───────────────────────

function EditorFooter({
  onSave, loading, showAdvanced, setShowAdvanced,
}: {
  onSave: () => void
  loading: boolean
  showAdvanced: boolean
  setShowAdvanced: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors underline"
      >
        {showAdvanced ? 'بستن ویرایش JSON' : 'ویرایش پیشرفته (JSON)'}
      </button>
      <button
        onClick={onSave}
        disabled={loading}
        className="bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-60"
      >
        {loading ? 'ذخیره...' : 'ذخیره'}
      </button>
    </div>
  )
}

function JsonFallback({
  content, onChange,
}: {
  content: Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}) {
  const [raw, setRaw] = useState(JSON.stringify(content, null, 2))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRaw(JSON.stringify(content, null, 2))
  }, [content])

  function handleChange(v: string) {
    setRaw(v)
    try {
      onChange(JSON.parse(v))
      setError(null)
    } catch {
      setError('JSON نامعتبر است')
    }
  }

  return (
    <div className="mt-4">
      <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">JSON محتوا</label>
      <textarea
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        rows={8}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] resize-none"
      />
      {error && <p className="text-xs text-[var(--color-danger)] mt-1">{error}</p>}
    </div>
  )
}

// ── Shared field components ────────────────────────────────────────────────

function FieldInput({ label, value, onChange, placeholder, dir }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; dir?: 'ltr' | 'rtl'
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
      />
    </div>
  )
}

function FieldTextarea({ label, value, onChange, placeholder, rows = 3, dir }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; dir?: 'ltr' | 'rtl'
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        dir={dir}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] resize-none"
      />
    </div>
  )
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="مثال: ۱۴۰۰/۰۱ یا Jan 2021"
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
      />
    </div>
  )
}

function ItemCard({ title, onDelete, children }: { title: string; onDelete: () => void; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-[var(--color-bg-subtle)] transition-colors" onClick={() => setExpanded(!expanded)}>
        <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{title || '(بدون عنوان)'}</span>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] p-0.5 transition-colors">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5"><polyline points="2,4 14,4"/><path d="M5 4V2h6v2"/><path d="M6 7v5M10 7v5"/><path d="M3 4l1 10h8l1-10"/></svg>
          </button>
          <span className="text-[var(--color-text-muted)] text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && <div className="px-4 py-3 space-y-3 border-t border-[var(--color-border)]">{children}</div>}
    </div>
  )
}

// ── SUMMARY / TEXT_BLOCK / CUSTOM ──────────────────────────────────────────

function SummaryEditor({ section, onSave, showAdvanced, setShowAdvanced }: EditorProps) {
  const [text, setText] = useState<string>(
    typeof section.content.text === 'string' ? section.content.text : ''
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setText(typeof section.content.text === 'string' ? section.content.text : '')
  }, [section.id, section.content.text])

  async function save() {
    setLoading(true)
    await onSave(section.id, { text })
    setLoading(false)
  }

  const charCount = text.length
  const isOptimal = charCount >= 100 && charCount <= 400

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-[var(--color-text-secondary)]">متن</label>
          <span className={`text-xs ${isOptimal ? 'text-[var(--color-success)]' : charCount > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]'}`}>
            {charCount} کاراکتر {charCount > 0 && (isOptimal ? '✓' : charCount < 100 ? '(کوتاه)' : '(طولانی)')}
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="خلاصه‌ای از تجربه، مهارت‌ها و اهداف حرفه‌ای خود بنویسید..."
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] resize-none leading-relaxed"
        />
      </div>
      {showAdvanced && (
        <JsonFallback content={{ text }} onChange={(c) => setText(typeof c.text === 'string' ? c.text : text)} />
      )}
      <EditorFooter onSave={save} loading={loading} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    </div>
  )
}

// ── EXPERIENCE ─────────────────────────────────────────────────────────────

interface ExperienceItem {
  company: string
  role: string
  location?: string
  startDate: string
  endDate: string
  isCurrent: boolean
  description?: string
  achievements: string[]
  technologies: string[]
}

function ExperienceEditor({ section, onSave, showAdvanced, setShowAdvanced }: EditorProps) {
  const rawItems = Array.isArray(section.content.items) ? section.content.items as ExperienceItem[] : []
  const [items, setItems] = useState<ExperienceItem[]>(rawItems)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setItems(Array.isArray(section.content.items) ? section.content.items as ExperienceItem[] : [])
  }, [section.id])

  function addItem() {
    setItems(prev => [...prev, { company: '', role: '', startDate: '', endDate: '', isCurrent: false, achievements: [''], technologies: [] }])
  }

  function updateItem(idx: number, patch: Partial<ExperienceItem>) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item))
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function addAchievement(idx: number) {
    updateItem(idx, { achievements: [...(items[idx]?.achievements ?? []), ''] })
  }

  function updateAchievement(itemIdx: number, achIdx: number, value: string) {
    const achievements = [...(items[itemIdx]?.achievements ?? [])]
    achievements[achIdx] = value
    updateItem(itemIdx, { achievements })
  }

  function removeAchievement(itemIdx: number, achIdx: number) {
    updateItem(itemIdx, { achievements: (items[itemIdx]?.achievements ?? []).filter((_, i) => i !== achIdx) })
  }

  function moveAchievement(itemIdx: number, achIdx: number, dir: -1 | 1) {
    const achievements = [...(items[itemIdx]?.achievements ?? [])]
    const target = achIdx + dir
    if (target < 0 || target >= achievements.length) return
    ;[achievements[achIdx], achievements[target]] = [achievements[target], achievements[achIdx]]
    updateItem(itemIdx, { achievements })
  }

  async function save() {
    setLoading(true)
    await onSave(section.id, { items })
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <ItemCard key={idx} title={item.role ? `${item.role} — ${item.company}` : ''} onDelete={() => removeItem(idx)}>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="عنوان شغلی" value={item.role} onChange={(v) => updateItem(idx, { role: v })} placeholder="Front-end Developer" />
            <FieldInput label="شرکت / سازمان" value={item.company} onChange={(v) => updateItem(idx, { company: v })} placeholder="شرکت نمونه" />
          </div>
          <FieldInput label="موقعیت جغرافیایی" value={item.location ?? ''} onChange={(v) => updateItem(idx, { location: v })} placeholder="تهران، ایران / Remote" />
          <div className="grid grid-cols-2 gap-3">
            <DateInput label="تاریخ شروع" value={item.startDate} onChange={(v) => updateItem(idx, { startDate: v })} />
            {!item.isCurrent && <DateInput label="تاریخ پایان" value={item.endDate} onChange={(v) => updateItem(idx, { endDate: v })} />}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={item.isCurrent}
              onChange={(e) => updateItem(idx, { isCurrent: e.target.checked, endDate: e.target.checked ? '' : item.endDate })}
              className="rounded border-[var(--color-border)] text-[var(--color-brand-600)]"
            />
            <span className="text-sm text-[var(--color-text-secondary)]">هنوز در این موقعیت هستم</span>
          </label>
          <FieldTextarea label="توضیحات (اختیاری)" value={item.description ?? ''} onChange={(v) => updateItem(idx, { description: v })} rows={2} placeholder="شرح موقعیت و مسئولیت‌ها..." />

          {/* Achievements */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">دستاوردها و مسئولیت‌ها</label>
              <span className={`text-xs ${(item.achievements?.length ?? 0) < 2 ? 'text-[var(--color-warning)]' : (item.achievements?.length ?? 0) > 6 ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
                {item.achievements?.length ?? 0} آیتم {(item.achievements?.length ?? 0) > 0 && (item.achievements?.length ?? 0) < 3 ? '(بیشتر اضافه کنید)' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {(item.achievements ?? []).map((ach, aIdx) => (
                <div key={aIdx} className="flex items-start gap-2">
                  <div className="flex flex-col gap-0.5 shrink-0 mt-1.5">
                    <button
                      type="button"
                      onClick={() => moveAchievement(idx, aIdx, -1)}
                      disabled={aIdx === 0}
                      title="انتقال به بالا"
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-25 p-0.5 transition-colors"
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="3,10 8,5 13,10"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveAchievement(idx, aIdx, 1)}
                      disabled={aIdx === (item.achievements?.length ?? 0) - 1}
                      title="انتقال به پایین"
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-25 p-0.5 transition-colors"
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="3,6 8,11 13,6"/></svg>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={ach}
                    onChange={(e) => updateAchievement(idx, aIdx, e.target.value)}
                    placeholder="با فعل شروع کنید: طراحی، توسعه، بهینه‌سازی..."
                    className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                  />
                  <button type="button" onClick={() => removeAchievement(idx, aIdx)} className="mt-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] p-0.5 shrink-0">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><line x1="2" y1="8" x2="14" y2="8"/></svg>
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => addAchievement(idx)} className="mt-2 text-xs text-[var(--color-brand-600)] hover:underline flex items-center gap-1">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
              افزودن دستاورد
            </button>
          </div>

          {/* Technologies */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">تکنولوژی‌ها (با کاما جدا کنید)</label>
            <input
              type="text"
              value={(item.technologies ?? []).join(', ')}
              onChange={(e) => updateItem(idx, { technologies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="React, TypeScript, Node.js, PostgreSQL"
              dir="ltr"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
            />
          </div>
        </ItemCard>
      ))}

      <button type="button" onClick={addItem} className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] dark:hover:bg-[var(--color-brand-900)]/20 transition-colors">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
        افزودن موقعیت شغلی
      </button>

      {showAdvanced && <JsonFallback content={{ items }} onChange={(c) => setItems(Array.isArray(c.items) ? c.items as ExperienceItem[] : items)} />}
      <EditorFooter onSave={save} loading={loading} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    </div>
  )
}

// ── EDUCATION ──────────────────────────────────────────────────────────────

interface EducationItem {
  institution: string
  degree: string
  field: string
  startDate: string
  endDate: string
  description?: string
  gpa?: string
}

function EducationEditor({ section, onSave, showAdvanced, setShowAdvanced }: EditorProps) {
  const [items, setItems] = useState<EducationItem[]>(Array.isArray(section.content.items) ? section.content.items as EducationItem[] : [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setItems(Array.isArray(section.content.items) ? section.content.items as EducationItem[] : [])
  }, [section.id])

  function add() { setItems(prev => [...prev, { institution: '', degree: '', field: '', startDate: '', endDate: '' }]) }
  function update(idx: number, patch: Partial<EducationItem>) { setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item)) }
  function remove(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  async function save() { setLoading(true); await onSave(section.id, { items }); setLoading(false) }

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <ItemCard key={idx} title={item.degree ? `${item.degree}${item.institution ? ' — ' + item.institution : ''}` : ''} onDelete={() => remove(idx)}>
          <FieldInput label="دانشگاه / مؤسسه" value={item.institution} onChange={(v) => update(idx, { institution: v })} placeholder="دانشگاه تهران" />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="مقطع" value={item.degree} onChange={(v) => update(idx, { degree: v })} placeholder="کارشناسی ارشد" />
            <FieldInput label="رشته تحصیلی" value={item.field} onChange={(v) => update(idx, { field: v })} placeholder="مهندسی نرم‌افزار" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DateInput label="تاریخ شروع" value={item.startDate} onChange={(v) => update(idx, { startDate: v })} />
            <DateInput label="تاریخ پایان" value={item.endDate} onChange={(v) => update(idx, { endDate: v })} />
          </div>
          <FieldInput label="معدل (اختیاری)" value={item.gpa ?? ''} onChange={(v) => update(idx, { gpa: v })} placeholder="۱۷.۵ / ۲۰" />
          <FieldTextarea label="توضیحات (اختیاری)" value={item.description ?? ''} onChange={(v) => update(idx, { description: v })} rows={2} />
        </ItemCard>
      ))}
      <button type="button" onClick={add} className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] dark:hover:bg-[var(--color-brand-900)]/20 transition-colors">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
        افزودن سابقه تحصیلی
      </button>
      {showAdvanced && <JsonFallback content={{ items }} onChange={(c) => setItems(Array.isArray(c.items) ? c.items as EducationItem[] : items)} />}
      <EditorFooter onSave={save} loading={loading} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    </div>
  )
}

// ── PROJECT ────────────────────────────────────────────────────────────────

interface ProjectItem {
  title: string
  role?: string
  description?: string
  technologies: string[]
  demoUrl?: string
  repoUrl?: string
  features: string[]
  startDate?: string
  endDate?: string
}

function ProjectEditor({ section, onSave, showAdvanced, setShowAdvanced }: EditorProps) {
  const [items, setItems] = useState<ProjectItem[]>(Array.isArray(section.content.items) ? section.content.items as ProjectItem[] : [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setItems(Array.isArray(section.content.items) ? section.content.items as ProjectItem[] : [])
  }, [section.id])

  function add() { setItems(prev => [...prev, { title: '', technologies: [], features: [] }]) }
  function update(idx: number, patch: Partial<ProjectItem>) { setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item)) }
  function remove(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  function addFeature(idx: number) { update(idx, { features: [...(items[idx]?.features ?? []), ''] }) }
  function updateFeature(itemIdx: number, fIdx: number, val: string) {
    const features = [...(items[itemIdx]?.features ?? [])]
    features[fIdx] = val
    update(itemIdx, { features })
  }
  function removeFeature(itemIdx: number, fIdx: number) { update(itemIdx, { features: (items[itemIdx]?.features ?? []).filter((_, i) => i !== fIdx) }) }

  async function save() { setLoading(true); await onSave(section.id, { items }); setLoading(false) }

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <ItemCard key={idx} title={item.title} onDelete={() => remove(idx)}>
          <FieldInput label="نام پروژه" value={item.title} onChange={(v) => update(idx, { title: v })} placeholder="پلتفرم مدیریت دوره‌های آنلاین" />
          <FieldInput label="نقش (اختیاری)" value={item.role ?? ''} onChange={(v) => update(idx, { role: v })} placeholder="توسعه‌دهنده ارشد فرانت‌اند" />
          <FieldTextarea label="توضیحات" value={item.description ?? ''} onChange={(v) => update(idx, { description: v })} rows={3} placeholder="شرح پروژه، چالش‌ها و راه‌حل‌ها..." />
          <FieldInput label="تکنولوژی‌ها (کاما جدا)" value={(item.technologies ?? []).join(', ')} onChange={(v) => update(idx, { technologies: v.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Next.js, NestJS, PostgreSQL" dir="ltr" />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="لینک Demo" value={item.demoUrl ?? ''} onChange={(v) => update(idx, { demoUrl: v })} placeholder="https://..." dir="ltr" />
            <FieldInput label="لینک Repository" value={item.repoUrl ?? ''} onChange={(v) => update(idx, { repoUrl: v })} placeholder="https://github.com/..." dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DateInput label="تاریخ شروع" value={item.startDate ?? ''} onChange={(v) => update(idx, { startDate: v })} />
            <DateInput label="تاریخ پایان" value={item.endDate ?? ''} onChange={(v) => update(idx, { endDate: v })} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">ویژگی‌ها و دستاوردها</label>
            </div>
            <div className="space-y-2">
              {(item.features ?? []).map((feat, fIdx) => (
                <div key={fIdx} className="flex items-center gap-2">
                  <span className="text-[var(--color-text-muted)] text-sm shrink-0">•</span>
                  <input
                    type="text"
                    value={feat}
                    onChange={(e) => updateFeature(idx, fIdx, e.target.value)}
                    placeholder="ویژگی یا دستاورد..."
                    className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                  />
                  <button type="button" onClick={() => removeFeature(idx, fIdx)} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] p-0.5 shrink-0">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><line x1="2" y1="8" x2="14" y2="8"/></svg>
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => addFeature(idx)} className="mt-2 text-xs text-[var(--color-brand-600)] hover:underline flex items-center gap-1">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
              افزودن ویژگی
            </button>
          </div>
        </ItemCard>
      ))}
      <button type="button" onClick={add} className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] dark:hover:bg-[var(--color-brand-900)]/20 transition-colors">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
        افزودن پروژه
      </button>
      {showAdvanced && <JsonFallback content={{ items }} onChange={(c) => setItems(Array.isArray(c.items) ? c.items as ProjectItem[] : items)} />}
      <EditorFooter onSave={save} loading={loading} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    </div>
  )
}

// ── SKILL (grouped) ────────────────────────────────────────────────────────

interface SkillGroup { name: string; skills: string[] }

function SkillEditor({ section, onSave, showAdvanced, setShowAdvanced }: EditorProps) {
  const [groups, setGroups] = useState<SkillGroup[]>(
    Array.isArray(section.content.groups) ? section.content.groups as SkillGroup[] : []
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setGroups(Array.isArray(section.content.groups) ? section.content.groups as SkillGroup[] : [])
  }, [section.id])

  function addGroup() { setGroups(prev => [...prev, { name: '', skills: [] }]) }
  function removeGroup(idx: number) { setGroups(prev => prev.filter((_, i) => i !== idx)) }
  function updateGroupName(idx: number, name: string) { setGroups(prev => prev.map((g, i) => i === idx ? { ...g, name } : g)) }
  function updateGroupSkills(idx: number, raw: string) {
    const skills = raw.split(',').map(s => s.trim()).filter(Boolean)
    setGroups(prev => prev.map((g, i) => i === idx ? { ...g, skills } : g))
  }
  function removeSkill(gIdx: number, sIdx: number) {
    setGroups(prev => prev.map((g, i) => i === gIdx ? { ...g, skills: g.skills.filter((_, j) => j !== sIdx) } : g))
  }
  function addSkillToGroup(gIdx: number, skill: string) {
    if (!skill.trim()) return
    setGroups(prev => prev.map((g, i) => i === gIdx ? { ...g, skills: [...g.skills, skill.trim()] } : g))
  }
  function moveGroup(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= groups.length) return
    setGroups(prev => {
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }
  function moveSkill(gIdx: number, sIdx: number, dir: -1 | 1) {
    const target = sIdx + dir
    if (target < 0 || target >= (groups[gIdx]?.skills.length ?? 0)) return
    setGroups(prev => prev.map((g, i) => {
      if (i !== gIdx) return g
      const skills = [...g.skills]
      ;[skills[sIdx], skills[target]] = [skills[target], skills[sIdx]]
      return { ...g, skills }
    }))
  }

  async function save() { setLoading(true); await onSave(section.id, { groups }); setLoading(false) }

  return (
    <div className="space-y-4">
      {groups.map((group, gIdx) => (
        <div key={gIdx} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-3 border-b border-[var(--color-border)]">
            {/* Group reorder buttons */}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => moveGroup(gIdx, -1)}
                disabled={gIdx === 0}
                title="انتقال به بالا"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-25 p-0.5 transition-colors"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="3,10 8,5 13,10"/></svg>
              </button>
              <button
                type="button"
                onClick={() => moveGroup(gIdx, 1)}
                disabled={gIdx === groups.length - 1}
                title="انتقال به پایین"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-25 p-0.5 transition-colors"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="3,6 8,11 13,6"/></svg>
              </button>
            </div>
            <input
              type="text"
              value={group.name}
              onChange={(e) => updateGroupName(gIdx, e.target.value)}
              placeholder="نام گروه مهارت (مثال: Frontend، Backend، DevOps)"
              className="flex-1 text-sm font-medium text-[var(--color-text-primary)] bg-transparent placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
            <button type="button" onClick={() => removeGroup(gIdx)} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] p-0.5 shrink-0">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5"><polyline points="2,4 14,4"/><path d="M5 4V2h6v2"/><path d="M6 7v5M10 7v5"/><path d="M3 4l1 10h8l1-10"/></svg>
            </button>
          </div>
          <div className="px-4 py-3 space-y-3">
            {/* Skills chips with reorder */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px]">
              {group.skills.map((skill, sIdx) => (
                <span key={sIdx} className="inline-flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
                  <button
                    type="button"
                    onClick={() => moveSkill(gIdx, sIdx, -1)}
                    disabled={sIdx === 0}
                    title="انتقال به بالا"
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-20 transition-colors leading-none"
                  >‹</button>
                  <span className="px-1">{skill}</span>
                  <button
                    type="button"
                    onClick={() => moveSkill(gIdx, sIdx, 1)}
                    disabled={sIdx === group.skills.length - 1}
                    title="انتقال به پایین"
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-20 transition-colors leading-none"
                  >›</button>
                  <button type="button" onClick={() => removeSkill(gIdx, sIdx)} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] mr-0.5 leading-none">×</button>
                </span>
              ))}
            </div>
            {/* Add skills via text input */}
            <div>
              <input
                type="text"
                placeholder="مهارت‌ها را با کاما جدا کنید و Enter بزنید: React, TypeScript, Next.js"
                dir="ltr"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    const val = e.currentTarget.value.replace(/,$/, '').trim()
                    if (val) { addSkillToGroup(gIdx, val); e.currentTarget.value = '' }
                  }
                }}
                onBlur={(e) => {
                  const val = e.currentTarget.value.trim()
                  if (val) { addSkillToGroup(gIdx, val); e.currentTarget.value = '' }
                }}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">یا همه را یکجا وارد کنید:</p>
              <input
                type="text"
                value={group.skills.join(', ')}
                onChange={(e) => updateGroupSkills(gIdx, e.target.value)}
                placeholder="React, TypeScript, CSS, Tailwind"
                dir="ltr"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
              />
            </div>
          </div>
        </div>
      ))}

      <button type="button" onClick={addGroup} className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] dark:hover:bg-[var(--color-brand-900)]/20 transition-colors">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
        افزودن گروه مهارت جدید
      </button>

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        💡 مهارت‌ها را گروه‌بندی کنید. مثال: Frontend، Backend، DevOps، Soft Skills. گروه‌بندی مهارت‌ها خوانایی رزومه را بیشتر می‌کند.
      </div>

      {showAdvanced && <JsonFallback content={{ groups }} onChange={(c) => setGroups(Array.isArray(c.groups) ? c.groups as SkillGroup[] : groups)} />}
      <EditorFooter onSave={save} loading={loading} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    </div>
  )
}

// ── CERTIFICATE ────────────────────────────────────────────────────────────

interface CertItem { title: string; issuer: string; issuedAt: string; verificationUrl?: string }

function CertificateEditor({ section, onSave, showAdvanced, setShowAdvanced }: EditorProps) {
  const [items, setItems] = useState<CertItem[]>(Array.isArray(section.content.items) ? section.content.items as CertItem[] : [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setItems(Array.isArray(section.content.items) ? section.content.items as CertItem[] : [])
  }, [section.id])

  function add() { setItems(prev => [...prev, { title: '', issuer: '', issuedAt: '' }]) }
  function update(idx: number, patch: Partial<CertItem>) { setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item)) }
  function remove(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  async function save() { setLoading(true); await onSave(section.id, { items }); setLoading(false) }

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <ItemCard key={idx} title={item.title ? `${item.title} — ${item.issuer}` : ''} onDelete={() => remove(idx)}>
          <FieldInput label="عنوان مدرک / گواهی‌نامه" value={item.title} onChange={(v) => update(idx, { title: v })} placeholder="React Developer Certificate" />
          <FieldInput label="صادرکننده" value={item.issuer} onChange={(v) => update(idx, { issuer: v })} placeholder="آکادمی ایرنو" />
          <DateInput label="تاریخ صدور" value={item.issuedAt} onChange={(v) => update(idx, { issuedAt: v })} />
          <FieldInput label="لینک تأییدیه (اختیاری)" value={item.verificationUrl ?? ''} onChange={(v) => update(idx, { verificationUrl: v })} placeholder="https://..." dir="ltr" />
        </ItemCard>
      ))}
      <button type="button" onClick={add} className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] dark:hover:bg-[var(--color-brand-900)]/20 transition-colors">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
        افزودن مدرک
      </button>
      {showAdvanced && <JsonFallback content={{ items }} onChange={(c) => setItems(Array.isArray(c.items) ? c.items as CertItem[] : items)} />}
      <EditorFooter onSave={save} loading={loading} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    </div>
  )
}

// ── LANGUAGE ────────────────────────────────────────────────────────────────

interface LangItem { language: string; level: string }

const LANG_LEVELS = ['مبتدی', 'پایه', 'متوسط', 'پیشرفته', 'مسلط', 'زبان مادری', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function LanguageEditor({ section, onSave, showAdvanced, setShowAdvanced }: EditorProps) {
  const [items, setItems] = useState<LangItem[]>(Array.isArray(section.content.items) ? section.content.items as LangItem[] : [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setItems(Array.isArray(section.content.items) ? section.content.items as LangItem[] : [])
  }, [section.id])

  function add() { setItems(prev => [...prev, { language: '', level: 'متوسط' }]) }
  function update(idx: number, patch: Partial<LangItem>) { setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item)) }
  function remove(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  async function save() { setLoading(true); await onSave(section.id, { items }); setLoading(false) }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3">
          <div className="flex-1">
            <input
              type="text"
              value={item.language}
              onChange={(e) => update(idx, { language: e.target.value })}
              placeholder="نام زبان (مثال: انگلیسی، آلمانی)"
              className="w-full text-sm text-[var(--color-text-primary)] bg-transparent placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
          </div>
          <select
            value={item.level}
            onChange={(e) => update(idx, { level: e.target.value })}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
          >
            {LANG_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <button type="button" onClick={() => remove(idx)} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] p-0.5">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5"><polyline points="2,4 14,4"/><path d="M5 4V2h6v2"/><path d="M6 7v5M10 7v5"/><path d="M3 4l1 10h8l1-10"/></svg>
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] dark:hover:bg-[var(--color-brand-900)]/20 transition-colors">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
        افزودن زبان
      </button>
      {showAdvanced && <JsonFallback content={{ items }} onChange={(c) => setItems(Array.isArray(c.items) ? c.items as LangItem[] : items)} />}
      <EditorFooter onSave={save} loading={loading} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    </div>
  )
}

// ── LINK ────────────────────────────────────────────────────────────────────

interface LinkItem { label: string; url: string }

function LinkEditor({ section, onSave, showAdvanced, setShowAdvanced }: EditorProps) {
  const [items, setItems] = useState<LinkItem[]>(Array.isArray(section.content.items) ? section.content.items as LinkItem[] : [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setItems(Array.isArray(section.content.items) ? section.content.items as LinkItem[] : [])
  }, [section.id])

  function add() { setItems(prev => [...prev, { label: '', url: '' }]) }
  function update(idx: number, patch: Partial<LinkItem>) { setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item)) }
  function remove(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  async function save() { setLoading(true); await onSave(section.id, { items }); setLoading(false) }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-5 gap-2 items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3">
          <input
            type="text"
            value={item.label}
            onChange={(e) => update(idx, { label: e.target.value })}
            placeholder="برچسب (مثال: GitHub)"
            className="col-span-2 text-sm text-[var(--color-text-primary)] bg-transparent placeholder:text-[var(--color-text-muted)] focus:outline-none border-l border-[var(--color-border)] pl-3"
          />
          <input
            type="url"
            value={item.url}
            onChange={(e) => update(idx, { url: e.target.value })}
            placeholder="https://..."
            dir="ltr"
            className="col-span-2 text-sm text-[var(--color-text-primary)] bg-transparent placeholder:text-[var(--color-text-muted)] focus:outline-none"
          />
          <button type="button" onClick={() => remove(idx)} className="col-span-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] text-center">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5 mx-auto"><polyline points="2,4 14,4"/><path d="M5 4V2h6v2"/><path d="M6 7v5M10 7v5"/><path d="M3 4l1 10h8l1-10"/></svg>
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] dark:hover:bg-[var(--color-brand-900)]/20 transition-colors">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
        افزودن لینک
      </button>
      {showAdvanced && <JsonFallback content={{ items }} onChange={(c) => setItems(Array.isArray(c.items) ? c.items as LinkItem[] : items)} />}
      <EditorFooter onSave={save} loading={loading} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
    </div>
  )
}
