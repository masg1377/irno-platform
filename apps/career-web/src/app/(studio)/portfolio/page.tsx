'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PortfolioProjectDto } from '@irno/types'
import { PortfolioProjectVisibility } from '@irno/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  // Basic info
  title: string
  role: string
  clientName: string
  summary: string
  projectType: string
  startDate: string
  endDate: string
  // Case study
  problem: string
  solution: string
  impact: string
  responsibilities: string[]
  responsibilityInput: string
  // Technologies
  technologies: string[]
  techInput: string
  // Links & media
  demoUrl: string
  repoUrl: string
  coverImageUrl: string
  mediaUrls: string[]
  mediaInput: string
  // Display
  visibility: string
  isFeatured: boolean
  // SEO
  seoTitle: string
  seoDescription: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = {
  title: '',
  role: '',
  clientName: '',
  summary: '',
  projectType: '',
  startDate: '',
  endDate: '',
  problem: '',
  solution: '',
  impact: '',
  responsibilities: [],
  responsibilityInput: '',
  technologies: [],
  techInput: '',
  demoUrl: '',
  repoUrl: '',
  coverImageUrl: '',
  mediaUrls: [],
  mediaInput: '',
  visibility: PortfolioProjectVisibility.PRIVATE,
  isFeatured: false,
  seoTitle: '',
  seoDescription: '',
}

const PROJECT_TYPES = [
  { value: '', label: 'انتخاب نوع پروژه' },
  { value: 'personal', label: 'شخصی' },
  { value: 'work', label: 'کاری' },
  { value: 'opensource', label: 'متن‌باز (Open Source)' },
  { value: 'educational', label: 'آموزشی' },
  { value: 'enterprise', label: 'سازمانی' },
]

const VISIBILITY_CONFIG: Record<string, { label: string; color: string }> = {
  [PortfolioProjectVisibility.PRIVATE]: {
    label: 'خصوصی',
    color: 'text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] border-[var(--color-border)]',
  },
  [PortfolioProjectVisibility.PUBLIC_LINK]: {
    label: 'با لینک',
    color: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/20 dark:border-blue-800',
  },
  [PortfolioProjectVisibility.PUBLIC]: {
    label: 'عمومی',
    color: 'text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-900/20 dark:border-green-800',
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPayload(form: FormState) {
  return {
    title: form.title.trim(),
    role: form.role.trim() || null,
    clientName: form.clientName.trim() || null,
    summary: form.summary.trim() || null,
    projectType: form.projectType || null,
    startDate: form.startDate.trim() || null,
    endDate: form.endDate.trim() || null,
    problem: form.problem.trim() || null,
    solution: form.solution.trim() || null,
    impact: form.impact.trim() || null,
    responsibilities: form.responsibilities,
    technologies: form.technologies,
    demoUrl: form.demoUrl.trim() || null,
    repoUrl: form.repoUrl.trim() || null,
    coverImageUrl: form.coverImageUrl.trim() || null,
    mediaUrls: form.mediaUrls,
    visibility: form.visibility,
    isFeatured: form.isFeatured,
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
  }
}

function formFromProject(p: PortfolioProjectDto): FormState {
  return {
    title: p.title,
    role: p.role ?? '',
    clientName: (p as any).clientName ?? '',
    summary: (p as any).summary ?? '',
    projectType: (p as any).projectType ?? '',
    startDate: p.startDate ? String(p.startDate) : '',
    endDate: p.endDate ? String(p.endDate) : '',
    problem: (p as any).problem ?? '',
    solution: (p as any).solution ?? '',
    impact: (p as any).impact ?? '',
    responsibilities: [...((p as any).responsibilities ?? [])],
    responsibilityInput: '',
    technologies: [...p.technologies],
    techInput: '',
    demoUrl: p.demoUrl ?? '',
    repoUrl: p.repoUrl ?? '',
    coverImageUrl: p.coverImageUrl ?? '',
    mediaUrls: [...((p as any).mediaUrls ?? [])],
    mediaInput: '',
    visibility: p.visibility,
    isFeatured: p.isFeatured,
    seoTitle: (p as any).seoTitle ?? '',
    seoDescription: (p as any).seoDescription ?? '',
  }
}

// ── Section heading inside form ────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          {title}
        </span>
        <div className="flex-1 border-t border-[var(--color-border)]" />
      </div>
      {children}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [projects, setProjects] = useState<PortfolioProjectDto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<PortfolioProjectDto | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM })
  const [reordering, setReordering] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('basic')

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/career/portfolio/projects?pageSize=50')
      const json = await res.json()
      const data: PortfolioProjectDto[] = json?.data?.data ?? json?.data ?? []
      setProjects(data)
    } catch {
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // ── Modal open ──────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingProject(null)
    setForm({ ...EMPTY_FORM })
    setFormError(null)
    setActiveSection('basic')
    setModalOpen(true)
  }

  function openEdit(p: PortfolioProjectDto) {
    setEditingProject(p)
    setForm(formFromProject(p))
    setFormError(null)
    setActiveSection('basic')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingProject(null)
    setFormError(null)
  }

  // ── Form helpers ────────────────────────────────────────────────────────────

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleTechKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const value = form.techInput.trim().replace(/,$/, '')
      if (value && !form.technologies.includes(value)) {
        setForm((prev) => ({ ...prev, technologies: [...prev.technologies, value], techInput: '' }))
      } else {
        setField('techInput', '')
      }
    }
  }

  function removeTech(tech: string) {
    setForm((prev) => ({ ...prev, technologies: prev.technologies.filter((t) => t !== tech) }))
  }

  function handleResponsibilityKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const value = form.responsibilityInput.trim()
      if (value) {
        setForm((prev) => ({
          ...prev,
          responsibilities: [...prev.responsibilities, value],
          responsibilityInput: '',
        }))
      }
    }
  }

  function removeResponsibility(idx: number) {
    setForm((prev) => ({
      ...prev,
      responsibilities: prev.responsibilities.filter((_, i) => i !== idx),
    }))
  }

  function handleMediaKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const value = form.mediaInput.trim()
      if (value && !form.mediaUrls.includes(value)) {
        setForm((prev) => ({ ...prev, mediaUrls: [...prev.mediaUrls, value], mediaInput: '' }))
      } else {
        setField('mediaInput', '')
      }
    }
  }

  function removeMedia(url: string) {
    setForm((prev) => ({ ...prev, mediaUrls: prev.mediaUrls.filter((u) => u !== url) }))
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      setFormError('عنوان پروژه الزامی است.')
      setActiveSection('basic')
      return
    }
    setFormError(null)
    setSaving(true)
    try {
      const payload = buildPayload(form)
      let res: Response
      if (editingProject) {
        res = await fetch(`/api/v1/career/portfolio/projects/${editingProject.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/v1/career/portfolio/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setFormError(d?.message ?? 'خطا در ذخیره پروژه.')
        return
      }
      closeModal()
      await loadProjects()
      showToast('success', editingProject ? 'پروژه ویرایش شد.' : 'پروژه جدید اضافه شد.')
    } catch {
      setFormError('خطا در اتصال به سرور.')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/v1/career/portfolio/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setProjects((prev) => prev.filter((p) => p.id !== id))
      showToast('success', 'پروژه حذف شد.')
    } catch {
      showToast('error', 'خطا در حذف پروژه.')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Featured toggle ─────────────────────────────────────────────────────────

  async function toggleFeatured(project: PortfolioProjectDto) {
    const newVal = !project.isFeatured
    setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, isFeatured: newVal } : p)))
    try {
      const res = await fetch(`/api/v1/career/portfolio/projects/${project.id}/featured`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: newVal }),
      })
      if (!res.ok) throw new Error()
      showToast('success', newVal ? 'پروژه برجسته شد.' : 'از برجسته‌ها حذف شد.')
    } catch {
      setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, isFeatured: !newVal } : p)))
      showToast('error', 'خطا در تغییر وضعیت برجسته.')
    }
  }

  // ── Reorder ─────────────────────────────────────────────────────────────────

  async function moveProject(index: number, direction: 'up' | 'down') {
    const newProjects = [...projects]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newProjects.length) return
    ;[newProjects[index], newProjects[swapIndex]] = [newProjects[swapIndex], newProjects[index]]
    setProjects(newProjects)
    setReordering(true)
    try {
      await fetch('/api/v1/career/portfolio/projects/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: newProjects.map((p, i) => ({ id: p.id, sortOrder: i })) }),
      })
    } catch {
      showToast('error', 'خطا در ذخیره ترتیب.')
    } finally {
      setReordering(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const FORM_SECTIONS = [
    { id: 'basic', label: 'اطلاعات اصلی' },
    { id: 'casestudy', label: 'کیس استادی' },
    { id: 'tech', label: 'تکنولوژی‌ها' },
    { id: 'links', label: 'لینک‌ها' },
    { id: 'display', label: 'نمایش' },
  ]

  return (
    <div className="space-y-6" dir="rtl">
      {/* Toast */}
      {toast && (
        <div
          className={[
            'fixed top-4 left-1/2 -translate-x-1/2 z-[100] rounded-xl border px-5 py-3 text-sm shadow-lg transition-all',
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200',
          ].join(' ')}
        >
          {toast.type === 'success' ? '✓ ' : '✕ '}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">پورتفولیو</h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
            پروژه‌ها، case study‌ها و نمونه‌کارهای خود را مدیریت کنید.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          افزودن پروژه
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)]"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-3xl">
            🗂️
          </div>
          <div className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
            هنوز پروژه‌ای اضافه نشده
          </div>
          <div className="text-sm text-[var(--color-text-muted)] mb-6 max-w-xs mx-auto leading-relaxed">
            پروژه‌های خود را با لینک، تکنولوژی‌ها و case study به پورتفولیو اضافه کنید.
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors"
          >
            افزودن اولین پروژه
          </button>
        </div>
      )}

      {/* Project grid */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {projects.map((p, idx) => {
            const vis = VISIBILITY_CONFIG[p.visibility] ?? VISIBILITY_CONFIG[PortfolioProjectVisibility.PRIVATE]
            const isDeleting = deletingId === p.id
            const pAny = p as any
            return (
              <div
                key={p.id}
                className={[
                  'group relative rounded-xl border bg-[var(--color-bg-elevated)] p-5 transition-shadow hover:shadow-md space-y-3',
                  isDeleting ? 'opacity-50 pointer-events-none' : 'border-[var(--color-border)]',
                ].join(' ')}
              >
                {/* Cover image */}
                {p.coverImageUrl && (
                  <div className="h-32 w-full rounded-lg overflow-hidden bg-[var(--color-bg-subtle)] mb-1">
                    <img
                      src={p.coverImageUrl}
                      alt={p.title}
                      className="h-full w-full object-cover"
                      onError={(e) => { ;(e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                )}

                {/* Title + badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                        {p.title}
                      </span>
                      {p.isFeatured && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                          ⭐ برجسته
                        </span>
                      )}
                      {pAny.projectType && (
                        <span className="inline-flex items-center rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 px-2 py-0.5 text-[10px] text-purple-700 dark:text-purple-300">
                          {PROJECT_TYPES.find((t) => t.value === pAny.projectType)?.label ?? pAny.projectType}
                        </span>
                      )}
                    </div>
                    {p.role && (
                      <div className="mt-0.5 text-xs text-[var(--color-text-muted)] truncate">{p.role}</div>
                    )}
                    {pAny.clientName && (
                      <div className="mt-0.5 text-xs text-[var(--color-text-muted)] truncate">
                        📍 {pAny.clientName}
                      </div>
                    )}
                  </div>
                  <span className={['inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium', vis.color].join(' ')}>
                    {vis.label}
                  </span>
                </div>

                {/* Summary or description */}
                {(pAny.summary || p.description) && (
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                    {pAny.summary || p.description}
                  </p>
                )}

                {/* Impact highlight */}
                {pAny.impact && (
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5">
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-300 leading-relaxed line-clamp-1">
                      📈 {pAny.impact}
                    </p>
                  </div>
                )}

                {/* Case study indicator */}
                {(pAny.problem || pAny.solution) && (
                  <div className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] rounded px-2 py-0.5 border border-[var(--color-border)]">
                    📋 کیس استادی ثبت شده
                  </div>
                )}

                {/* Tech chips */}
                {p.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.technologies.slice(0, 6).map((t) => (
                      <span key={t} className="inline-flex items-center rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-secondary)]">
                        {t}
                      </span>
                    ))}
                    {p.technologies.length > 6 && (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                        +{p.technologies.length - 6}
                      </span>
                    )}
                  </div>
                )}

                {/* Links */}
                {(p.demoUrl || p.repoUrl) && (
                  <div className="flex gap-2 flex-wrap">
                    {p.demoUrl && (
                      <a href={p.demoUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-[var(--color-brand-600)] hover:underline">
                        🔗 دمو
                      </a>
                    )}
                    {p.repoUrl && (
                      <a href={p.repoUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:underline">
                        GitHub ↗
                      </a>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--color-border)]">
                  <button onClick={() => moveProject(idx, 'up')} disabled={idx === 0 || reordering} title="انتقال به بالا"
                    className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-30 transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button onClick={() => moveProject(idx, 'down')} disabled={idx === projects.length - 1 || reordering} title="انتقال به پایین"
                    className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-30 transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => toggleFeatured(p)} title={p.isFeatured ? 'حذف از برجسته‌ها' : 'برجسته کردن'}
                    className={['rounded p-1 transition-colors', p.isFeatured ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]'].join(' ')}>
                    <svg className="h-3.5 w-3.5" fill={p.isFeatured ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                  <button onClick={() => openEdit(p)} title="ویرایش"
                    className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {deletingId === p.id ? (
                    <span className="text-[10px] text-[var(--color-text-muted)]">حذف…</span>
                  ) : (
                    <button onClick={() => { if (confirm(`پروژه "${p.title}" حذف شود؟`)) handleDelete(p.id) }} title="حذف"
                      className="rounded p-1 text-[var(--color-danger)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal — full case study builder */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                {editingProject ? 'ویرایش پروژه' : 'افزودن پروژه جدید'}
              </h2>
              <button onClick={closeModal} className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Section tabs */}
            <div className="flex overflow-x-auto border-b border-[var(--color-border)] px-5 gap-1 pt-2">
              {FORM_SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={[
                    'shrink-0 px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors border-b-2 -mb-px',
                    activeSection === sec.id
                      ? 'border-[var(--color-brand-600)] text-[var(--color-brand-600)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
                  ].join(' ')}
                >
                  {sec.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="px-5 py-5 space-y-5">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                  {formError}
                </div>
              )}

              {/* ── Section: اطلاعات اصلی ── */}
              {activeSection === 'basic' && (
                <div className="space-y-4">
                  <div>
                    <label className="field-label">عنوان پروژه <span className="text-[var(--color-danger)]">*</span></label>
                    <input type="text" value={form.title} onChange={(e) => setField('title', e.target.value)}
                      placeholder="نام پروژه را وارد کنید" className="input-field" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label">نقش من در پروژه</label>
                      <input type="text" value={form.role} onChange={(e) => setField('role', e.target.value)}
                        placeholder="مثال: Frontend Developer" className="input-field" />
                    </div>
                    <div>
                      <label className="field-label">کارفرما / مشتری</label>
                      <input type="text" value={form.clientName} onChange={(e) => setField('clientName', e.target.value)}
                        placeholder="نام شرکت یا کارفرما" className="input-field" />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">خلاصه پروژه</label>
                    <textarea value={form.summary} onChange={(e) => setField('summary', e.target.value)}
                      rows={2} maxLength={500} placeholder="یک جمله مختصر درباره پروژه..."
                      className="input-field resize-none" />
                    <div className="mt-0.5 text-right text-[10px] text-[var(--color-text-muted)]">{form.summary.length} / 500</div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="field-label">نوع پروژه</label>
                      <select value={form.projectType} onChange={(e) => setField('projectType', e.target.value)} className="input-field">
                        {PROJECT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">تاریخ شروع</label>
                      <input type="text" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)}
                        placeholder="۱۴۰۱" className="input-field" />
                    </div>
                    <div>
                      <label className="field-label">تاریخ پایان</label>
                      <input type="text" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)}
                        placeholder="۱۴۰۲ یا اکنون" className="input-field" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Section: کیس استادی ── */}
              {activeSection === 'casestudy' && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                    کیس استادی به کارفرمایان و همتایان نشان می‌دهد که چه چالشی داشتید، چه کردید و چه نتیجه‌ای گرفتید.
                  </div>
                  <div>
                    <label className="field-label">مسئله — چه مشکل یا چالشی وجود داشت؟</label>
                    <textarea value={form.problem} onChange={(e) => setField('problem', e.target.value)}
                      rows={3} placeholder="وضعیت اولیه و چالش اصلی پروژه را توضیح دهید..."
                      className="input-field resize-none" />
                  </div>
                  <div>
                    <label className="field-label">راه‌حل — چه رویکردی انتخاب کردید؟</label>
                    <textarea value={form.solution} onChange={(e) => setField('solution', e.target.value)}
                      rows={3} placeholder="روش، معماری یا راه‌حل فنی که پیاده کردید..."
                      className="input-field resize-none" />
                  </div>
                  <div>
                    <label className="field-label">مسئولیت‌ها — دقیقاً چه کارهایی انجام دادید؟</label>
                    <div className="space-y-1.5">
                      {form.responsibilities.map((r, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-1.5 text-sm text-[var(--color-text-primary)]">
                            {r}
                          </span>
                          <button type="button" onClick={() => removeResponsibility(i)}
                            className="rounded p-1 text-[var(--color-danger)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <input type="text" value={form.responsibilityInput}
                        onChange={(e) => setField('responsibilityInput', e.target.value)}
                        onKeyDown={handleResponsibilityKeyDown}
                        placeholder="یک مسئولیت وارد کنید و Enter بزنید..."
                        className="input-field" />
                    </div>
                    <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">Enter برای افزودن هر آیتم</div>
                  </div>
                  <div>
                    <label className="field-label">نتیجه و اثر — چه تاثیری داشت؟</label>
                    <textarea value={form.impact} onChange={(e) => setField('impact', e.target.value)}
                      rows={3} placeholder="نتایج قابل اندازه‌گیری، بهبودها، یادگیری‌ها..."
                      className="input-field resize-none" />
                    <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                      مثال: سرعت بارگذاری ۴۰٪ بهبود یافت، ۲۰۰۰ کاربر جدید در ماه اول
                    </div>
                  </div>
                </div>
              )}

              {/* ── Section: تکنولوژی‌ها ── */}
              {activeSection === 'tech' && (
                <div className="space-y-4">
                  <div>
                    <label className="field-label">تکنولوژی‌ها</label>
                    <div className="flex flex-wrap gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 min-h-[2.5rem]">
                      {form.technologies.map((tech) => (
                        <span key={tech} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)]/40 px-2 py-0.5 text-xs text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)]">
                          {tech}
                          <button type="button" onClick={() => removeTech(tech)}
                            className="text-[var(--color-brand-400)] hover:text-[var(--color-brand-600)] transition-colors leading-none">×</button>
                        </span>
                      ))}
                      <input type="text" value={form.techInput}
                        onChange={(e) => setField('techInput', e.target.value)}
                        onKeyDown={handleTechKeyDown}
                        placeholder={form.technologies.length === 0 ? 'React، TypeScript و...' : ''}
                        className="flex-1 min-w-[120px] bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]" />
                    </div>
                    <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">Enter یا کاما برای افزودن هر تکنولوژی</div>
                  </div>
                </div>
              )}

              {/* ── Section: لینک‌ها ── */}
              {activeSection === 'links' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label">لینک دمو</label>
                      <input type="url" value={form.demoUrl} onChange={(e) => setField('demoUrl', e.target.value)}
                        placeholder="https://example.com" className="input-field" />
                    </div>
                    <div>
                      <label className="field-label">لینک مخزن (GitHub)</label>
                      <input type="url" value={form.repoUrl} onChange={(e) => setField('repoUrl', e.target.value)}
                        placeholder="https://github.com/..." className="input-field" />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">تصویر Cover (URL)</label>
                    <input type="url" value={form.coverImageUrl} onChange={(e) => setField('coverImageUrl', e.target.value)}
                      placeholder="https://..." className="input-field" />
                  </div>
                  <div>
                    <label className="field-label">تصاویر و رسانه‌های اضافی</label>
                    <div className="space-y-1.5">
                      {form.mediaUrls.map((url, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] truncate">
                            {url}
                          </span>
                          <button type="button" onClick={() => removeMedia(url)}
                            className="rounded p-1 text-[var(--color-danger)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <input type="url" value={form.mediaInput}
                        onChange={(e) => setField('mediaInput', e.target.value)}
                        onKeyDown={handleMediaKeyDown}
                        placeholder="آدرس تصویر یا ویدیو و Enter بزنید..."
                        className="input-field" />
                    </div>
                    <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">Enter برای افزودن هر لینک رسانه</div>
                  </div>
                </div>
              )}

              {/* ── Section: نمایش ── */}
              {activeSection === 'display' && (
                <div className="space-y-4">
                  <div>
                    <label className="field-label">نمایش پروژه</label>
                    <select value={form.visibility} onChange={(e) => setField('visibility', e.target.value)} className="input-field">
                      <option value={PortfolioProjectVisibility.PRIVATE}>خصوصی — فقط برای خودم</option>
                      <option value={PortfolioProjectVisibility.PUBLIC_LINK}>با لینک — هر کسی با لینک می‌بیند</option>
                      <option value={PortfolioProjectVisibility.PUBLIC}>عمومی — در پروفایل عمومی نمایش داده می‌شود</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.isFeatured} onChange={(e) => setField('isFeatured', e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-brand-600)]" />
                      <div>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">پروژه شاخص ⭐</span>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                          پروژه‌های برجسته در پروفایل عمومی اول نمایش داده می‌شوند.
                        </p>
                      </div>
                    </label>
                  </div>
                  <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
                    <div className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">تنظیمات SEO</div>
                    <div>
                      <label className="field-label">عنوان SEO</label>
                      <input type="text" value={form.seoTitle} onChange={(e) => setField('seoTitle', e.target.value)}
                        maxLength={255} placeholder="عنوان برای موتور جستجو (اختیاری)" className="input-field" />
                    </div>
                    <div>
                      <label className="field-label">توضیحات SEO</label>
                      <textarea value={form.seoDescription} onChange={(e) => setField('seoDescription', e.target.value)}
                        rows={2} maxLength={500} placeholder="توضیح برای موتور جستجو (اختیاری)"
                        className="input-field resize-none" />
                      <div className="mt-0.5 text-right text-[10px] text-[var(--color-text-muted)]">{form.seoDescription.length} / 500</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-2 border-t border-[var(--color-border)] pt-4">
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-lg bg-[var(--color-brand-600)] py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:opacity-60 transition-colors">
                  {saving ? 'در حال ذخیره...' : editingProject ? 'ذخیره تغییرات' : 'افزودن پروژه'}
                </button>
                <button type="button" onClick={closeModal}
                  className="flex-1 rounded-lg border border-[var(--color-border)] py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors">
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .field-label {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
        }
        .input-field {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          background: var(--color-bg-subtle);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--color-text-primary);
          outline: none;
          transition: box-shadow 0.15s;
        }
        .input-field:focus {
          box-shadow: 0 0 0 2px var(--color-brand-600, #4f46e5);
        }
        .input-field::placeholder {
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  )
}
