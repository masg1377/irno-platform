'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { CareerProfileDto } from '@irno/types'

interface CareerShellProps {
  children: React.ReactNode
  profile: CareerProfileDto | null
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

function navItems(): NavItem[] {
  return [
    { label: 'داشبورد', href: '/studio', icon: <IconHome /> },
    { label: 'رزومه‌های من', href: '/resumes', icon: <IconResume /> },
    { label: 'بررسی رزومه', href: '/studio/checker', icon: <IconChecker /> },
    { label: 'پروفایل', href: '/profile', icon: <IconProfile /> },
    { label: 'پورتفولیو', href: '/portfolio', icon: <IconPortfolio /> },
    { label: 'مسیر شغلی', href: '/studio/roadmap', icon: <IconRoadmap /> },
    { label: 'تطابق شغلی', href: '/studio/job-match', icon: <IconJobMatch /> },
    { label: 'قالب‌ها', href: '/studio/templates', icon: <IconTemplates /> },
    { label: 'تنظیمات', href: '/settings', icon: <IconSettings /> },
  ]
}

export function CareerShell({ children, profile }: CareerShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const hubWebUrl = process.env['NEXT_PUBLIC_HUB_WEB_URL'] ?? 'http://localhost:3000'
  const displayName = profile?.displayName ?? 'کاربر'
  const avatarLetter = displayName[0] ?? 'ک'

  async function handleLogout() {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' })
    } catch {}
    router.push(`${hubWebUrl}/auth/login`)
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('irno-theme', isDark ? 'dark' : 'light')
  }

  const items = navItems()

  return (
    <div className="flex min-h-screen">
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 right-0 z-30 flex w-64 flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-elevated)] transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-[var(--color-border)] px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-600)] text-white font-bold text-sm">
            CV
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--color-text-primary)]">ایرنو CV</div>
            <div className="text-xs text-[var(--color-text-muted)]">Career Studio</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== '/studio' && pathname.startsWith(item.href)) || (item.href === '/studio' && (pathname === '/studio' || pathname === '/'))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={[
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] font-medium dark:bg-[var(--color-brand-900)] dark:text-[var(--color-brand-300)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]',
                ].join(' ')}
              >
                <span className="w-4 shrink-0">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User area */}
        <div className="border-t border-[var(--color-border)] p-3">
          <div className="flex items-center gap-2 rounded-lg p-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)] text-sm font-bold">
              {avatarLetter}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[var(--color-text-primary)]">{displayName}</div>
              {profile?.headline && (
                <div className="truncate text-xs text-[var(--color-text-muted)]">{profile.headline}</div>
              )}
            </div>
          </div>
          <div className="mt-2 flex gap-1">
            <button
              onClick={toggleTheme}
              className="flex-1 rounded-md px-2 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              تم
            </button>
            <a
              href={hubWebUrl}
              className="flex-1 rounded-md px-2 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors text-center"
            >
              هاب
            </a>
            <button
              onClick={handleLogout}
              className="flex-1 rounded-md px-2 py-1.5 text-xs text-[var(--color-danger)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              خروج
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4">
          <button
            className="lg:hidden rounded-md p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
            onClick={() => setSidebarOpen(true)}
          >
            <IconMenu />
          </button>
          <div className="text-sm font-medium text-[var(--color-text-secondary)] lg:hidden">ایرنو CV</div>
          <div className="flex items-center gap-2 mr-auto">
            {profile?.publicSlug && (
              <a
                href={`/public/${profile.publicSlug}`}
                target="_blank"
                className="rounded-md px-3 py-1.5 text-xs bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] transition-colors"
              >
                پروفایل عمومی
              </a>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────

function IconHome() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
      <path d="M8 1.5L1 7.5V14h5v-3.5h4V14h5V7.5L8 1.5z" />
    </svg>
  )
}
function IconResume() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <rect x="2" y="1" width="12" height="14" rx="1.5" />
      <line x1="5" y1="5" x2="11" y2="5" />
      <line x1="5" y1="8" x2="11" y2="8" />
      <line x1="5" y1="11" x2="8" y2="11" />
    </svg>
  )
}
function IconChecker() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M5 8l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconProfile() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <circle cx="8" cy="5" r="3" />
      <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" strokeLinecap="round" />
    </svg>
  )
}
function IconPortfolio() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <rect x="1" y="5" width="14" height="9" rx="1" />
      <path d="M5 5V4a1 1 0 011-1h4a1 1 0 011 1v1" />
    </svg>
  )
}
function IconRoadmap() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M1 12L5 4l4 5 3-4 3 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconJobMatch() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <line x1="10" y1="10" x2="14" y2="14" strokeLinecap="round" />
    </svg>
  )
}
function IconTemplates() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  )
}
function IconMenu() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <line x1="2" y1="4" x2="14" y2="4" strokeLinecap="round" />
      <line x1="2" y1="8" x2="14" y2="8" strokeLinecap="round" />
      <line x1="2" y1="12" x2="14" y2="12" strokeLinecap="round" />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
