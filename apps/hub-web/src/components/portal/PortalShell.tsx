'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import type { PortalMeDto } from '@irno/types'
import { UserRole } from '@irno/types'
import { fa } from '@irno/i18n'

interface PortalShellProps {
  children: React.ReactNode
  portalMe: PortalMeDto
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles?: UserRole[]
  external?: boolean
}

const careerWebUrl = process.env['NEXT_PUBLIC_CAREER_WEB_URL'] ?? 'http://localhost:3002'

function studentNavItems(): NavItem[] {
  return [
    { label: 'خانه', href: '/portal', icon: <IconHome /> },
    { label: 'پروفایل', href: '/portal/profile', icon: <IconProfile /> },
    { label: 'دوره‌های من', href: '/portal/enrollments', icon: <IconCourses /> },
    { label: 'پرداخت‌های من', href: '/portal/payments', icon: <IconPayments /> },
    { label: 'اقساط من', href: '/portal/installments', icon: <IconInstallments /> },
    { label: 'رویدادهای من', href: '/portal/events', icon: <IconEvents /> },
    { label: 'جلسات آنلاین', href: '/portal/meetino', icon: <IconVideo /> },
    { label: 'مهارت‌های من', href: '/portal/skills', icon: <IconSkills /> },
    { label: 'اعتبارهای من', href: '/portal/credits', icon: <IconCreditsPortal /> },
    { label: 'مدارک من', href: '/portal/certificates', icon: <IconCertificates /> },
    { label: 'ایرنو CV', href: careerWebUrl, icon: <IconCareerStudio />, external: true },
    { label: 'اعلان‌ها', href: '/portal/notifications', icon: <IconBell /> },
  ]
}

function applicantNavItems(): NavItem[] {
  return [
    { label: 'خانه', href: '/portal', icon: <IconHome /> },
    { label: 'پروفایل', href: '/portal/profile', icon: <IconProfile /> },
    { label: 'وضعیت درخواست', href: '/portal/applicant-status', icon: <IconStatus /> },
    { label: 'رویدادها', href: '/portal/events', icon: <IconEvents /> },
    { label: 'اعلان‌ها', href: '/portal/notifications', icon: <IconBell /> },
  ]
}

function getNavItems(role: UserRole): NavItem[] {
  const studentRoles: UserRole[] = [UserRole.STUDENT]
  if (studentRoles.includes(role)) return studentNavItems()
  return applicantNavItems()
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PortalShell({ children, portalMe }: PortalShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const displayName = portalMe.profile
    ? `${portalMe.profile.firstName} ${portalMe.profile.lastName}`
    : portalMe.mobile

  const avatarLetter = portalMe.profile?.firstName?.[0] ?? 'م'

  const navItems = getNavItems(portalMe.role)

  const sidebarClasses = [
    'fixed inset-y-0 right-0 z-30 flex flex-col',
    'border-l border-[var(--color-border)] bg-[var(--color-bg-elevated)]',
    'transition-transform duration-200 ease-in-out',
    'lg:static lg:z-auto lg:translate-x-0 lg:transition-none',
    sidebarOpen ? 'translate-x-0' : 'translate-x-full',
  ].join(' ')

  async function handleLogout() {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]" dir="rtl">
      {/* Portal Topbar */}
      <header
        className="fixed inset-x-0 top-0 z-40 flex items-center border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4"
        style={{ height: 'var(--topbar-height)' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-600)]">
            <span className="text-sm font-bold text-white">I</span>
          </div>
          <div>
            <span className="font-semibold text-[var(--color-text-primary)]">ایرنو</span>
            <span className="mr-1 text-xs text-[var(--color-text-muted)]">پورتال</span>
          </div>
        </div>

        {/* Right side */}
        <div className="mr-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-sm text-[var(--color-text-secondary)]">{displayName}</span>
            <span className="rounded-md bg-[var(--color-bg-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
              {fa.roles[portalMe.role]}
            </span>
          </div>
          <NotificationBell />
          <ThemeToggle />

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] lg:hidden"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="منو"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <rect y="2" width="18" height="2" rx="1" />
              <rect y="8" width="18" height="2" rx="1" />
              <rect y="14" width="18" height="2" rx="1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden" style={{ marginTop: 'var(--topbar-height)' }}>
        {/* Sidebar */}
        <aside
          className={sidebarClasses}
          style={{ width: 'var(--sidebar-width)', top: 'var(--topbar-height)' }}
          aria-label="ناوبری پورتال"
        >
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            <div className="mb-1 px-3 pb-1 pt-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                حساب من
              </span>
            </div>
            <ul className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = !item.external && (pathname === item.href || (item.href !== '/portal' && pathname.startsWith(item.href)))
                const linkClass = [
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)]/30 dark:text-[var(--color-brand-300)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]',
                ].join(' ')
                return (
                  <li key={item.href}>
                    {item.external ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                        <span className="shrink-0 text-current">{item.icon}</span>
                        <span>{item.label}</span>
                        <span className="mr-auto text-[10px] opacity-60">↗</span>
                      </a>
                    ) : (
                      <Link href={item.href} onClick={() => setSidebarOpen(false)} className={linkClass}>
                        <span className="shrink-0 text-current">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User section + logout */}
          <div className="border-t border-[var(--color-border)] p-3">
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))' }}
              >
                {avatarLetter}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                  {displayName}
                </div>
                <div className="truncate text-xs text-[var(--color-text-muted)]">
                  {fa.roles[portalMe.role]}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="خروج"
                aria-label="خروج"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                <IconLogout />
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 6.5L8 2l6 4.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z" />
      <path d="M5.5 15V9.5h5V15" />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="5" r="3" />
      <path d="M1 15c0-3.866 3.134-7 7-7s7 3.134 7 7" />
    </svg>
  )
}

function IconCourses() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="2" width="14" height="12" rx="1.5" />
      <path d="M5 6h6M5 9h4" />
    </svg>
  )
}

function IconPayments() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="3" width="14" height="10" rx="1.5" />
      <path d="M1 7h14" />
      <path d="M4 11h2" />
    </svg>
  )
}

function IconInstallments() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 2h12v12H2z" rx="1" />
      <path d="M5 5h6M5 8h4M5 11h2" />
    </svg>
  )
}

function IconEvents() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="3" width="14" height="12" rx="1.5" />
      <path d="M5 1v4M11 1v4M1 7h14" />
    </svg>
  )
}

function IconVideo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="4" width="10" height="8" rx="1.5" />
      <path d="M11 6.5l4-2v7l-4-2V6.5z" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1a5 5 0 015 5v3l1 2H2l1-2V6a5 5 0 015-5z" />
      <path d="M6.5 13a1.5 1.5 0 003 0" />
    </svg>
  )
}

function IconStatus() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="7" />
      <path d="M5 8l2 2 4-4" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" />
    </svg>
  )
}

function IconSkills() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6L8 9.8l-3.2 1.6.6-3.6L3 5.3l3.6-.5L8 1.5z" strokeLinejoin="round" />
    </svg>
  )
}

function IconCreditsPortal() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="3" width="14" height="10" rx="1.5" />
      <circle cx="5.5" cy="8" r="1.5" />
      <path d="M9 6.5h4M9 9.5h4" strokeLinecap="round" />
    </svg>
  )
}

function IconCertificates() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1.5" width="14" height="10" rx="1.5" />
      <path d="M4 5.5h8M4 8h5" strokeLinecap="round" />
      <circle cx="11" cy="13" r="2" />
      <path d="M9.5 13h-6" strokeLinecap="round" />
    </svg>
  )
}

function IconCareerStudio() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M5 6h4M5 8.5h6M5 11h3" strokeLinecap="round" />
    </svg>
  )
}
