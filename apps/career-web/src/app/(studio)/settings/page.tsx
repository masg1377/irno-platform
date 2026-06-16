'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CareerProfileDto, ContactVisibilityConfig } from '@irno/types'

const CAREER_WEB_URL =
  process.env['NEXT_PUBLIC_CAREER_WEB_URL'] ?? 'http://localhost:3002'
const HUB_WEB_URL =
  process.env['NEXT_PUBLIC_HUB_WEB_URL'] ?? 'http://localhost:3000'

// ── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:ring-offset-2',
        checked
          ? 'bg-[var(--color-brand-600)]'
          : 'bg-gray-300 dark:bg-gray-600',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out',
          checked ? '-translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

// ── Save Status Badge ─────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  const map: Record<Exclude<SaveStatus, 'idle'>, { text: string; cls: string }> = {
    saving: { text: 'در حال ذخیره...', cls: 'text-[var(--color-text-muted)]' },
    saved: { text: 'ذخیره شد ✓', cls: 'text-green-600 dark:text-green-400' },
    error: { text: 'خطا در ذخیره', cls: 'text-[var(--color-danger)]' },
  }
  const { text, cls } = map[status]
  return <span className={`text-xs ${cls}`}>{text}</span>
}

// ── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Save Button ───────────────────────────────────────────────────────────────

function SaveButton({
  status,
  onClick,
}: {
  status: SaveStatus
  onClick: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={status === 'saving'}
        className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {status === 'saving' ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
      </button>
      <SaveBadge status={status} />
    </div>
  )
}

// ── Main Settings Page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [profile, setProfile] = useState<CareerProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Section 1: Public Profile
  const [publicEnabled, setPublicEnabled] = useState(false)
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const [copyLabel, setCopyLabel] = useState('کپی لینک عمومی')
  const [saveStatus1, setSaveStatus1] = useState<SaveStatus>('idle')

  // Section 2: Contact Visibility
  const [contactVis, setContactVis] = useState<ContactVisibilityConfig>({
    showEmail: true,
    showPhone: false,
    showLocation: true,
    showWebsite: true,
    showLinkedin: true,
    showGithub: true,
    showPortfolio: true,
  })
  const [saveStatus2, setSaveStatus2] = useState<SaveStatus>('idle')

  // Section 3: SEO
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [saveStatus3, setSaveStatus3] = useState<SaveStatus>('idle')

  // ── Load profile ───────────────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/career/me')
      if (!res.ok) throw new Error('خطا در بارگذاری پروفایل')
      const json = await res.json()
      const data: CareerProfileDto = json?.data ?? json
      setProfile(data)

      // Hydrate section states
      setPublicEnabled(data.visibility === 'PUBLIC_LINK')
      setSlug(data.publicSlug ?? '')
      if (data.contactVisibilityConfig) {
        setContactVis(data.contactVisibilityConfig)
      }
      setSeoTitle(data.seoTitle ?? '')
      setSeoDescription(data.seoDescription ?? '')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'خطا در بارگذاری')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // ── Helpers ────────────────────────────────────────────────────────────────

  function validateSlug(value: string): string {
    if (!value) return ''
    if (!/^[a-z0-9-]+$/.test(value)) {
      return 'فقط حروف انگلیسی کوچک، اعداد و خط تیره مجاز است'
    }
    if (value.length < 3) return 'حداقل ۳ کاراکتر'
    if (value.length > 60) return 'حداکثر ۶۰ کاراکتر'
    return ''
  }

  function handleSlugChange(val: string) {
    const normalized = val.toLowerCase().replace(/\s+/g, '-')
    setSlug(normalized)
    setSlugError(validateSlug(normalized))
  }

  async function patchSettings(body: Record<string, unknown>) {
    const res = await fetch('/api/v1/career/profile/public-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.message ?? 'خطا در ذخیره')
    }
    await loadProfile()
  }

  function setStatusWithReset(
    setter: (s: SaveStatus) => void,
    status: SaveStatus,
  ) {
    setter(status)
    if (status === 'saved' || status === 'error') {
      setTimeout(() => setter('idle'), 3000)
    }
  }

  // ── Save handlers ──────────────────────────────────────────────────────────

  async function savePublicProfile() {
    if (publicEnabled && slugError) return
    setSaveStatus1('saving')
    try {
      await patchSettings({
        visibility: publicEnabled ? 'PUBLIC_LINK' : 'PRIVATE',
        publicSlug: publicEnabled && slug ? slug : null,
      })
      setStatusWithReset(setSaveStatus1, 'saved')
    } catch {
      setStatusWithReset(setSaveStatus1, 'error')
    }
  }

  async function saveContactVisibility() {
    setSaveStatus2('saving')
    try {
      await patchSettings({ contactVisibilityConfig: contactVis })
      setStatusWithReset(setSaveStatus2, 'saved')
    } catch {
      setStatusWithReset(setSaveStatus2, 'error')
    }
  }

  async function saveSeo() {
    setSaveStatus3('saving')
    try {
      await patchSettings({
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      })
      setStatusWithReset(setSaveStatus3, 'saved')
    } catch {
      setStatusWithReset(setSaveStatus3, 'error')
    }
  }

  async function copyPublicLink() {
    const url = `${CAREER_WEB_URL}/public/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopyLabel('لینک کپی شد ✓')
      setTimeout(() => setCopyLabel('کپی لینک عمومی'), 2000)
    } catch {
      setCopyLabel('کپی ناموفق')
      setTimeout(() => setCopyLabel('کپی لینک عمومی'), 2000)
    }
  }

  function updateContactVis(key: keyof ContactVisibilityConfig, val: boolean) {
    setContactVis((prev) => ({ ...prev, [key]: val }))
  }

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4" dir="rtl">
        <div className="h-7 w-32 rounded bg-[var(--color-bg-subtle)] animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 rounded-xl bg-[var(--color-bg-subtle)] animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="max-w-2xl" dir="rtl">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 text-center space-y-3">
          <p className="text-[var(--color-danger)] font-medium">{loadError}</p>
          <button
            onClick={loadProfile}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    )
  }

  const publicUrl =
    slug ? `${CAREER_WEB_URL}/public/${slug}` : null

  const contactVisRows: { key: keyof ContactVisibilityConfig; label: string }[] = [
    { key: 'showEmail', label: 'نمایش ایمیل' },
    { key: 'showPhone', label: 'نمایش شماره تماس' },
    { key: 'showLocation', label: 'نمایش موقعیت مکانی' },
    { key: 'showWebsite', label: 'نمایش وب‌سایت' },
    { key: 'showLinkedin', label: 'نمایش لینکدین' },
    { key: 'showGithub', label: 'نمایش گیت‌هاب' },
    { key: 'showPortfolio', label: 'نمایش لینک پورتفولیو' },
  ]

  return (
    <div className="max-w-2xl space-y-6" dir="rtl">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          تنظیمات
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          مدیریت پروفایل عمومی، حریم خصوصی و تنظیمات Career Studio
        </p>
      </div>

      {/* ── Section 1: Public Profile ──────────────────────────────────────── */}
      <SectionCard
        title="پروفایل عمومی"
        description="پروفایل عمومی شما را برای هر کسی که لینک را داشته باشد نمایش می‌دهد."
      >
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              فعال‌سازی پروفایل عمومی
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {publicEnabled
                ? 'پروفایل شما از طریق لینک عمومی قابل مشاهده است'
                : 'پروفایل شما خصوصی است'}
            </p>
          </div>
          <Toggle checked={publicEnabled} onChange={setPublicEnabled} />
        </div>

        {/* Slug input */}
        {publicEnabled && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">
              آدرس عمومی
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-text-muted)] whitespace-nowrap">
                {CAREER_WEB_URL}/public/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="your-name"
                dir="ltr"
                className={[
                  'flex-1 rounded-lg border px-3 py-2 text-sm bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] transition-colors',
                  slugError
                    ? 'border-[var(--color-danger)]'
                    : 'border-[var(--color-border)]',
                ].join(' ')}
              />
            </div>
            {slugError ? (
              <p className="text-xs text-[var(--color-danger)]">{slugError}</p>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">
                فقط حروف انگلیسی کوچک، اعداد و خط تیره
              </p>
            )}

            {/* Public URL display */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3 space-y-2">
              <p className="text-xs text-[var(--color-text-muted)]">
                لینک عمومی پروفایل:
              </p>
              <p
                className={`text-sm font-mono break-all ${
                  publicUrl
                    ? 'text-[var(--color-brand-600)]'
                    : 'text-[var(--color-text-muted)] italic'
                }`}
                dir="ltr"
              >
                {publicUrl ?? `${CAREER_WEB_URL}/public/(آدرس تعریف نشده)`}
              </p>
              {publicUrl && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={copyPublicLink}
                    className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
                  >
                    {copyLabel}
                  </button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
                  >
                    مشاهده پروفایل عمومی ↗
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        <SaveButton status={saveStatus1} onClick={savePublicProfile} />
      </SectionCard>

      {/* ── Section 2: Contact Visibility ─────────────────────────────────── */}
      <SectionCard
        title="کنترل حریم خصوصی تماس"
        description="انتخاب کنید چه اطلاعاتی در پروفایل عمومی نمایش داده شود"
      >
        <div className="divide-y divide-[var(--color-border)]">
          {contactVisRows.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <span className="text-sm text-[var(--color-text-primary)]">
                {label}
              </span>
              <Toggle
                checked={contactVis[key]}
                onChange={(val) => updateContactVis(key, val)}
              />
            </div>
          ))}
        </div>

        <SaveButton status={saveStatus2} onClick={saveContactVisibility} />
      </SectionCard>

      {/* ── Section 3: SEO Settings ────────────────────────────────────────── */}
      <SectionCard
        title="تنظیمات SEO"
        description="عنوان و توضیحات متا برای نمایش در موتورهای جستجو"
      >
        <div className="space-y-4">
          {/* SEO Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--color-text-primary)]">
                عنوان SEO
              </label>
              <span className="text-xs text-[var(--color-text-muted)]">
                {seoTitle.length} / ۲۵۵
              </span>
            </div>
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value.slice(0, 255))}
              placeholder="مثال: علی احمدی — توسعه‌دهنده فرانت‌اند"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] transition-colors"
            />
            <p className="text-xs text-[var(--color-text-muted)]">
              اگر خالی باشد، نام شما به عنوان عنوان استفاده می‌شود
            </p>
          </div>

          {/* SEO Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--color-text-primary)]">
                توضیحات SEO
              </label>
              <span className="text-xs text-[var(--color-text-muted)]">
                {seoDescription.length} / ۵۰۰
              </span>
            </div>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value.slice(0, 500))}
              placeholder="یک خلاصه کوتاه از مهارت‌ها و تجربه‌های حرفه‌ای خود بنویسید..."
              rows={3}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] resize-none transition-colors"
            />
            <p className="text-xs text-[var(--color-text-muted)]">
              بین ۵۰ تا ۱۶۰ کاراکتر برای نمایش بهتر در گوگل توصیه می‌شود
            </p>
          </div>
        </div>

        <SaveButton status={saveStatus3} onClick={saveSeo} />
      </SectionCard>

      {/* ── Section 4: Hub / Portal Links ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={HUB_WEB_URL}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 hover:bg-[var(--color-bg-subtle)] transition-colors group"
        >
          <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
            ایرنو هاب
          </div>
          <div className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
            مدیریت دوره‌ها و پرداخت‌ها ↗
          </div>
        </a>
        <a
          href={`${HUB_WEB_URL}/portal`}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 hover:bg-[var(--color-bg-subtle)] transition-colors group"
        >
          <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
            پورتال دانشجو
          </div>
          <div className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
            اقساط، ثبت‌نام‌ها و رویدادها ↗
          </div>
        </a>
      </div>

      {/* ── Section 5: Version Info ────────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span>Career Studio</span>
          <span className="rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 font-mono">
            Phase 19 — Public Live Resume & Portfolio
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span>پلتفرم ایرنو</span>
          <span>Irno Hub</span>
        </div>
      </div>
    </div>
  )
}
