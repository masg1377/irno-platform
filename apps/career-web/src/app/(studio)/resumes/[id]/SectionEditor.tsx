'use client'

import { useState } from 'react'
import type { ResumeSectionDto } from '@irno/types'
import { ResumeSectionType } from '@irno/types'
import { fa } from '@irno/i18n'

interface SectionEditorProps {
  resumeId: string
  initialSections: ResumeSectionDto[]
}

const SECTION_TYPE_COLORS: Record<string, string> = {
  SUMMARY: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  EXPERIENCE: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
  EDUCATION: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300',
  PROJECT: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
  SKILL: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
  CERTIFICATE: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300',
  COURSE: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300',
  CREDIT: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300',
  EVENT: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300',
  LANGUAGE: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300',
  LINK: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/30 dark:text-slate-300',
  CUSTOM: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700/30 dark:text-gray-300',
  TEXT_BLOCK: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700/30 dark:text-gray-300',
}

export function SectionEditor({ resumeId, initialSections }: SectionEditorProps) {
  const [sections, setSections] = useState<ResumeSectionDto[]>(initialSections)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState<string>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newType, setNewType] = useState<string>(ResumeSectionType.SUMMARY)
  const [newTitle, setNewTitle] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  const API = `/api/v1/career/resumes/${resumeId}/sections`

  async function toggleVisible(section: ResumeSectionDto) {
    const res = await fetch(`${API}/${section.id}`, {
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
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSections((prev) => prev.filter((s) => s.id !== id))
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

    const sectionIds = newSections.map((s) => s.id)
    setSections(newSections)

    await fetch(`/api/v1/career/resumes/${resumeId}/sections/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionIds }),
    })
  }

  function openEdit(section: ResumeSectionDto) {
    setExpandedId(section.id)
    setEditContent(JSON.stringify(section.content, null, 2))
  }

  async function saveContent(section: ResumeSectionDto) {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(editContent)
    } catch {
      alert('محتوا JSON معتبر نیست.')
      return
    }
    const res = await fetch(`${API}/${section.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: parsed }),
    })
    if (res.ok) {
      const data = await res.json()
      const updated = data?.data ?? data
      setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, ...updated } : s)))
      setExpandedId(null)
    }
  }

  async function handleAdd() {
    if (!newTitle.trim()) {
      setAddError('عنوان الزامی است.')
      return
    }
    setAddError(null)
    setAddLoading(true)
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType, title: newTitle.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        const section = data?.data ?? data
        setSections((prev) => [...prev, section])
        setShowAddModal(false)
        setNewTitle('')
        setNewType(ResumeSectionType.SUMMARY)
      } else {
        const data = await res.json().catch(() => ({}))
        setAddError(data?.message ?? 'خطا در افزودن بخش.')
      }
    } catch {
      setAddError('خطا در اتصال.')
    } finally {
      setAddLoading(false)
    }
  }

  async function importFromIrno() {
    setImportLoading(true)
    setImportResult(null)
    try {
      const res = await fetch(`/api/v1/career/resumes/${resumeId}/import-irno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importSkills: true, importCertificates: true, importCourses: true, importCredits: true }),
      })
      if (res.ok) {
        const data = await res.json()
        const result = data?.data ?? data
        setImportResult(`${result.sectionsCreated} بخش وارد شد، ${result.sectionsSkipped} بخش تکراری بود.`)
        // Refresh sections
        const sectionsRes = await fetch(`/api/v1/career/resumes/${resumeId}/sections`)
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json()
          setSections(sectionsData?.data ?? sectionsData ?? [])
        }
      } else {
        setImportResult('خطا در وارد کردن داده‌های ایرنو.')
      }
    } catch {
      setImportResult('خطا در اتصال به سرور.')
    } finally {
      setImportLoading(false)
    }
  }

  function renderContentPreview(section: ResumeSectionDto) {
    const c = section.content
    if (section.type === 'SUMMARY' || section.type === 'TEXT_BLOCK' || section.type === 'CUSTOM') {
      const text = typeof c.text === 'string' ? c.text : ''
      return (
        <textarea
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)] min-h-[80px] resize-none"
          value={typeof editContent === 'string' && expandedId === section.id ? editContent : text}
          onChange={(e) => setEditContent(JSON.stringify({ text: e.target.value }))}
          placeholder="متن بخش را اینجا بنویسید..."
        />
      )
    }
    if (section.type === 'SKILL') {
      const groups = Array.isArray(c.groups) ? c.groups as { name: string; skills: string[] }[] : []
      return (
        <div className="space-y-2">
          {groups.map((g, i) => (
            <div key={i}>
              <div className="text-xs font-medium text-[var(--color-text-muted)] mb-1">{g.name}</div>
              <div className="flex flex-wrap gap-1">
                {g.skills?.map((s, j) => (
                  <span key={j} className="inline-flex items-center rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">محتوایی ثبت نشده. از «وارد کردن از ایرنو» یا ویرایش JSON استفاده کنید.</p>
          )}
        </div>
      )
    }
    if (section.type === 'EXPERIENCE' || section.type === 'EDUCATION') {
      const items = Array.isArray(c.items) ? c.items as Record<string, unknown>[] : []
      return (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-xs">
              <div className="font-medium text-[var(--color-text-primary)]">
                {String(item.title ?? item.position ?? item.degree ?? '')}
              </div>
              <div className="text-[var(--color-text-muted)]">
                {String(item.company ?? item.institution ?? item.organization ?? '')}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">آیتمی ثبت نشده. از «وارد کردن از ایرنو» استفاده کنید.</p>
          )}
        </div>
      )
    }
    return (
      <textarea
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)] min-h-[120px] resize-none"
        value={expandedId === section.id ? editContent : JSON.stringify(c, null, 2)}
        onChange={(e) => setEditContent(e.target.value)}
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Import banner */}
      {importResult && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          {importResult}
        </div>
      )}

      {/* Section list */}
      {sections.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
          <div className="text-sm text-[var(--color-text-muted)]">هنوز بخشی اضافه نشده است.</div>
        </div>
      )}

      {sections.map((section, idx) => (
        <div key={section.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          {/* Section header */}
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Drag handle — visual only */}
            <span className="text-[var(--color-text-muted)] cursor-grab select-none">⣿</span>

            {/* Type badge */}
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${SECTION_TYPE_COLORS[section.type] ?? SECTION_TYPE_COLORS.CUSTOM}`}>
              {fa.resumeSectionType[section.type as keyof typeof fa.resumeSectionType] ?? section.type}
            </span>

            {/* Title */}
            <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)] truncate">
              {section.title}
            </span>

            {/* Reorder */}
            <div className="flex gap-0.5">
              <button
                onClick={() => moveSection(section.id, 'up')}
                disabled={idx === 0}
                className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-30 transition-colors"
                title="بالا"
              >
                ▲
              </button>
              <button
                onClick={() => moveSection(section.id, 'down')}
                disabled={idx === sections.length - 1}
                className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-30 transition-colors"
                title="پایین"
              >
                ▼
              </button>
            </div>

            {/* Eye toggle */}
            <button
              onClick={() => toggleVisible(section)}
              className={`rounded p-1.5 transition-colors ${section.isVisible ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-muted)]'} hover:bg-[var(--color-bg-subtle)]`}
              title={section.isVisible ? 'پنهان کردن' : 'نمایش دادن'}
            >
              {section.isVisible ? '👁' : '🚫'}
            </button>

            {/* Edit */}
            <button
              onClick={() => expandedId === section.id ? setExpandedId(null) : openEdit(section)}
              className="border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] rounded-lg px-3 py-1.5 text-xs transition-colors"
            >
              {expandedId === section.id ? 'بستن' : 'ویرایش'}
            </button>

            {/* Delete */}
            <button
              onClick={() => deleteSection(section.id)}
              className="rounded p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              title="حذف"
            >
              🗑
            </button>
          </div>

          {/* Expanded editor */}
          {expandedId === section.id && (
            <div className="border-t border-[var(--color-border)] px-4 py-4 space-y-3">
              {renderContentPreview(section)}
              <div className="flex gap-2">
                <button
                  onClick={() => saveContent(section)}
                  className="bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] rounded-lg px-4 py-2 text-xs transition-colors"
                >
                  ذخیره
                </button>
                <button
                  onClick={() => setExpandedId(null)}
                  className="border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] rounded-lg px-4 py-2 text-xs transition-colors"
                >
                  انصراف
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add section button */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] rounded-lg px-4 py-2 text-sm transition-colors"
        >
          + افزودن بخش
        </button>
        <button
          onClick={importFromIrno}
          disabled={importLoading}
          className="border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60"
        >
          {importLoading ? 'در حال وارد کردن...' : 'وارد کردن از ایرنو'}
        </button>
      </div>

      {/* Add section modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">افزودن بخش جدید</h3>

            {addError && (
              <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-[var(--color-danger)] dark:bg-red-900/20 dark:border-red-800">
                {addError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                  نوع بخش
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
                >
                  {Object.values(ResumeSectionType).map((t) => (
                    <option key={t} value={t}>
                      {fa.resumeSectionType[t as keyof typeof fa.resumeSectionType] ?? t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                  عنوان
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="عنوان این بخش..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAdd}
                disabled={addLoading}
                className="flex-1 bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60"
              >
                {addLoading ? 'در حال افزودن...' : 'افزودن'}
              </button>
              <button
                onClick={() => { setShowAddModal(false); setAddError(null); setNewTitle('') }}
                className="flex-1 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] rounded-lg px-4 py-2 text-sm transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
