import type { Metadata } from 'next'
import { getApps } from '@/lib/api'
import { fa } from '@irno/i18n'
import type { AppModuleDto } from '@irno/types'

export const metadata: Metadata = {
  title: 'اپلیکیشن‌ها',
}

export default async function AppsPage() {
  const apps = await getApps()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {fa.apps.title}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{fa.apps.subtitle}</p>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">هیچ اپلیکیشنی یافت نشد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  )
}

function AppCard({ app }: { app: AppModuleDto }) {
  const isActive = app.status === 'ACTIVE'
  const isComingSoon = app.status === 'COMING_SOON'

  return (
    <div
      className={`flex flex-col rounded-xl border p-5 transition-all ${
        isActive
          ? 'border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-brand-300)] hover:shadow-sm'
          : 'border-[var(--color-border)] bg-[var(--color-bg-subtle)] opacity-70'
      }`}
    >
      {/* Icon and status */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-brand-100)] text-2xl dark:bg-[var(--color-brand-900)]/30">
          {getAppIcon(app.key as string)}
        </div>
        {isComingSoon && (
          <span className="rounded-md bg-[var(--color-bg-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
            {fa.apps.comingSoon}
          </span>
        )}
        {app.status === 'DISABLED' && (
          <span className="rounded-md bg-[var(--color-danger)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-danger)]">
            {fa.apps.disabled}
          </span>
        )}
      </div>

      {/* Name and description */}
      <h3 className="mb-1 font-semibold text-[var(--color-text-primary)]">{app.nameLocal}</h3>
      {app.description && (
        <p className="mb-4 flex-1 text-sm text-[var(--color-text-muted)]">{app.description}</p>
      )}

      {/* Action button */}
      {isActive ? (
        <a
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)]"
        >
          {fa.apps.open}
        </a>
      ) : (
        <div className="mt-auto rounded-lg border border-[var(--color-border)] px-4 py-2 text-center text-sm text-[var(--color-text-muted)]">
          {isComingSoon ? fa.apps.comingSoon : fa.apps.disabled}
        </div>
      )}
    </div>
  )
}

function getAppIcon(key: string): string {
  const icons: Record<string, string> = {
    MEETINO: '🎥',
    IRNO_CHAT: '💬',
    IRNO_LEARN: '📚',
    IRNO_PROJECTS: '🏗️',
    IRNO_AI: '🤖',
  }
  return icons[key] ?? '🔲'
}
