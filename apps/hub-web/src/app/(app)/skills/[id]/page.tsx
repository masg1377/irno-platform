import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { fa } from '@irno/i18n'
import type { SkillDto } from '@irno/types'
import { SkillArchiveButton } from './skill-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

const API_BASE = (process.env['HUB_API_URL'] ?? 'http://localhost:4000') + '/api/v1'

async function getSkill(id: string): Promise<SkillDto | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('irno_at')?.value
  if (!token) return null
  try {
    const res = await fetch(`${API_BASE}/skills/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data: SkillDto }
    return json.data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const skill = await getSkill(id)
  return { title: skill?.title ?? 'مهارت' }
}

function InfoRow({ label, value, dir }: { label: string; value: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="text-sm text-[var(--color-text-primary)]" dir={dir}>
        {value}
      </span>
    </div>
  )
}

export default async function SkillDetailPage({ params }: PageProps) {
  const { id } = await params
  const skill = await getSkill(id)
  if (!skill) notFound()

  const isArchived = skill.status === 'ARCHIVED'

  return (
    <div className="mx-auto max-w-2xl">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/skills" className="hover:text-[var(--color-text-primary)]">
          {fa.skills.title}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{skill.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{skill.title}</h1>
          {isArchived && (
            <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
              بایگانی شد
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {!isArchived && <SkillArchiveButton skillId={skill.id} />}
        </div>
      </div>

      {/* Detail card */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">اطلاعات مهارت</h2>
        <InfoRow label="عنوان" value={skill.title} />
        <InfoRow label="Slug" value={skill.slug} dir="ltr" />
        <InfoRow label={fa.skills.category} value={skill.category ?? '—'} />
        <InfoRow
          label={fa.skills.skillLevel}
          value={fa.skillLevel[skill.level as keyof typeof fa.skillLevel] ?? skill.level}
        />
        <InfoRow
          label={fa.skills.status}
          value={fa.skillStatus[skill.status as keyof typeof fa.skillStatus] ?? skill.status}
        />
        <InfoRow
          label="تاریخ ایجاد"
          value={new Date(skill.createdAt).toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        />
        <InfoRow
          label="آخرین ویرایش"
          value={new Date(skill.updatedAt).toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        />
      </div>

      {/* Description */}
      {skill.description && (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">{fa.skills.description}</h2>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">{skill.description}</p>
        </div>
      )}

      {/* Back */}
      <div className="mt-6">
        <Link
          href="/skills"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          ← بازگشت به لیست مهارت‌ها
        </Link>
      </div>
    </div>
  )
}
