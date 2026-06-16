'use client'

import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import type { UserWithProfileDto } from '@irno/types'
import { fa } from '@irno/i18n'

interface TopbarProps {
  onMenuClick: () => void
  user: UserWithProfileDto
}

/**
 * Topbar — fixed at the top of all authenticated pages.
 * Height controlled by --topbar-height CSS variable.
 */
export function Topbar({ onMenuClick, user }: TopbarProps) {
  const displayName = user.profile
    ? `${user.profile.firstName} ${user.profile.lastName}`
    : user.mobile

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 flex items-center border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4"
      style={{ height: 'var(--topbar-height)' }}
    >
      {/* App title — right side in RTL */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-600)]">
          <span className="text-sm font-bold text-white">I</span>
        </div>
        <span className="font-semibold text-[var(--color-text-primary)]">ایرنو پلتفرم</span>
        <span className="hidden rounded-md bg-[var(--color-brand-50)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-brand-600)] sm:block dark:bg-[var(--color-brand-900)]/30 dark:text-[var(--color-brand-300)]">
          بتا
        </span>
      </div>

      {/* Right side — user info + actions */}
      <div className="mr-auto flex items-center gap-3">
        {/* User name + role badge (hidden on very small screens) */}
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-sm text-[var(--color-text-secondary)]">{displayName}</span>
          <span className="rounded-md bg-[var(--color-bg-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
            {fa.roles[user.role]}
          </span>
        </div>

        <NotificationBell />
        <ThemeToggle />

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] lg:hidden"
          aria-label="باز کردن منو"
        >
          <MenuIcon />
        </button>
      </div>
    </header>
  )
}

function MenuIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2 4.5h14M2 9h14M2 13.5h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
