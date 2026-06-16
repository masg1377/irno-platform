/**
 * IrnoIdShell — branding wrapper for Irno ID Hosted Auth UI.
 *
 * Shown on /auth/login, /auth/register, /auth/forgot-password.
 * Generic Irno ID identity — NOT Hub/admin-specific.
 *
 * Supports optional `app` context (e.g. "meetino") to show
 * "ورود به میتینو با حساب ایرنو" instead of generic title.
 */

import type { ReactNode } from 'react'

const APP_NAMES: Record<string, string> = {
  meetino: 'میتینو',
  hub: 'ایرنو هاب',
  career: 'ایرنو Career Studio',
  cv: 'ایرنو CV',
  learn: 'ایرنو لرن',
  events: 'ایرنو ایونتز',
  chat: 'ایرنو چت',
}

interface IrnoIdShellProps {
  children: ReactNode
  /** Title shown inside the card (e.g. "ورود به ایرنو") */
  title: string
  /** Subtitle shown inside the card */
  subtitle?: string
  /** App identifier from ?app= query param (e.g. "meetino") */
  appContext?: string | null
  /** Footer content (e.g. register link) */
  footer?: ReactNode
}

export function IrnoIdShell({ children, title, subtitle, appContext, footer }: IrnoIdShellProps) {
  const appName = appContext ? (APP_NAMES[appContext.toLowerCase()] ?? appContext) : null

  return (
    <div className="w-full max-w-md px-4">
      {/* ── Irno ID Logo ── */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-600)] shadow-lg">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="14" cy="14" r="12" stroke="white" strokeWidth="2.5" />
            <text
              x="14"
              y="19"
              textAnchor="middle"
              fill="white"
              fontSize="14"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              I
            </text>
          </svg>
        </div>

        {/* Brand name */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-brand-600)]">
          Irno ID
        </p>

        {/* Context-aware title */}
        {appName ? (
          <>
            <h1 className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">
              ورود به {appName} با حساب ایرنو
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
              برای ادامه، وارد حساب ایرنو خود شوید.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">
              حساب ایرنو
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
              با حساب ایرنو می‌توانید به تمام اپلیکیشن‌های ایرنو دسترسی داشته باشید.
            </p>
          </>
        )}
      </div>

      {/* ── Card ── */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-[var(--color-text-primary)]">
          {title}
        </h2>
        {subtitle && (
          <p className="mb-6 text-sm text-[var(--color-text-muted)]">{subtitle}</p>
        )}
        {!subtitle && <div className="mb-5" />}

        {children}
      </div>

      {/* ── Footer ── */}
      {footer && (
        <div className="mt-5 text-center text-sm text-[var(--color-text-muted)]">
          {footer}
        </div>
      )}

      {/* ── Apps list ── */}
      <p className="mt-6 text-center text-[11px] text-[var(--color-text-muted)]">
        میتینو · ایرنو لرن · ایرنو چت · و بیشتر
      </p>
    </div>
  )
}
