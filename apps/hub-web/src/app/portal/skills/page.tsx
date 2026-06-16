'use client'

import { useState, useEffect } from 'react'
import { fa } from '@irno/i18n'
import type { PortalSkillDto } from '@irno/types'

function LevelBadge({ level }: { level: string }) {
  const colorMap: Record<string, string> = {
    LEARNING: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    BASIC: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    CONFIDENT: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    ADVANCED: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    MASTERED: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorMap[level] ?? 'bg-gray-100 text-gray-600'}`}>
      {fa.studentSkillLevel[level as keyof typeof fa.studentSkillLevel] ?? level}
    </span>
  )
}

function SkillLevelDot({ level }: { level: string }) {
  const colorMap: Record<string, string> = {
    BEGINNER: 'bg-gray-300',
    INTERMEDIATE: 'bg-blue-400',
    ADVANCED: 'bg-orange-400',
    PROFESSIONAL: 'bg-green-500',
  }
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${colorMap[level] ?? 'bg-gray-300'}`}
      title={fa.skillLevel[level as keyof typeof fa.skillLevel] ?? level}
    />
  )
}

export default function PortalSkillsPage() {
  const [skills, setSkills] = useState<PortalSkillDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSkills() {
      try {
        const res = await fetch('/api/v1/portal/skills', { credentials: 'include' })
        const raw = (await res.json()) as { data?: PortalSkillDto[] | { data?: PortalSkillDto[] } }
        if (!res.ok) { setError('خطا در دریافت مهارت‌ها'); setLoading(false); return }
        // handle both array and paginated
        const payload = raw.data
        const list = Array.isArray(payload)
          ? payload
          : (payload as { data?: PortalSkillDto[] })?.data ?? []
        setSkills(list)
      } catch {
        setError('خطا در اتصال به سرور')
      } finally {
        setLoading(false)
      }
    }
    void fetchSkills()
  }, [])

  return (
    <div dir="rtl" className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">
        {fa.skills.mySkills}
      </h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        مهارت‌هایی که توسط مربیان یا سیستم ایرنو به شما اعطا شده است.
      </p>

      {loading && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && skills.length === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-subtle)]">
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" className="text-[var(--color-text-muted)]">
              <path d="M10 2l2.09 4.26L17 7.27l-3.5 3.41.83 4.82L10 13.2l-4.33 2.3.83-4.82L3 7.27l4.91-.71L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            هنوز هیچ مهارتی به شما اعطا نشده است.
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            مهارت‌ها پس از تکمیل دوره‌ها یا تأیید منتور به پروفایل شما اضافه می‌شوند.
          </p>
        </div>
      )}

      {!loading && !error && skills.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 transition-shadow hover:shadow-sm"
            >
              {/* Card header */}
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SkillLevelDot level={skill.skillLevel} />
                  <h2 className="font-semibold text-[var(--color-text-primary)]">{skill.title}</h2>
                </div>
                <LevelBadge level={skill.level} />
              </div>

              {/* Category */}
              {skill.category && (
                <p className="mb-3 text-xs text-[var(--color-text-muted)]">
                  دسته‌بندی: {skill.category}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
                <span>
                  سطح کاتالوگ: {fa.skillLevel[skill.skillLevel as keyof typeof fa.skillLevel] ?? skill.skillLevel}
                </span>
                <span>
                  {new Date(skill.awardedAt).toLocaleDateString('fa-IR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
