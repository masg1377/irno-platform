'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { UserWithProfileDto } from '@irno/types'
import { UserRole } from '@irno/types'
import { fa } from '@irno/i18n'

interface SidebarProps {
  open: boolean
  onClose: () => void
  user: UserWithProfileDto
}

// ─── Nav types ───────────────────────────────────────────────────────────────

interface NavLeaf {
  kind: 'leaf'
  label: string
  href: string
  icon: React.ReactNode
  roles?: UserRole[]
}

interface NavGroup {
  kind: 'group'
  label: string
  icon: React.ReactNode
  roles?: UserRole[]          // hide entire group if user lacks these roles
  children: NavLeaf[]
}

type NavEntry = NavLeaf | NavGroup

// ─── Nav config ──────────────────────────────────────────────────────────────

const ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN]
const FINANCE_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT]
const TEACHING_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.MENTOR]
const EVENT_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.TEACHER, UserRole.MENTOR]

const navConfig: NavEntry[] = [
  // ── داشبورد ──────────────────────────────────────────────────────────────
  {
    kind: 'leaf',
    label: 'داشبورد',
    href: '/dashboard',
    icon: <IconDashboard />,
  },

  // ── مدیریت آموزشی ────────────────────────────────────────────────────────
  {
    kind: 'group',
    label: 'مدیریت آموزشی',
    icon: <IconCourses />,
    children: [
      { kind: 'leaf', label: 'دوره‌ها', href: '/courses', icon: <IconCourses /> },
      { kind: 'leaf', label: 'گروه‌ها', href: '/groups', icon: <IconGroups /> },
      { kind: 'leaf', label: 'ثبت‌نام‌ها', href: '/enrollments', icon: <IconEnrollments /> },
      { kind: 'leaf', label: 'مهارت‌ها', href: '/skills', icon: <IconSkills />, roles: TEACHING_ROLES },
      { kind: 'leaf', label: 'اعتبارها', href: '/credits', icon: <IconCredits />, roles: TEACHING_ROLES },
    ],
  },

  // ── دانشجویان و جذب ──────────────────────────────────────────────────────
  {
    kind: 'group',
    label: 'دانشجویان و جذب',
    icon: <IconStudents />,
    children: [
      { kind: 'leaf', label: 'متقاضیان', href: '/applicants', icon: <IconApplicants /> },
      { kind: 'leaf', label: 'دانشجویان', href: '/students', icon: <IconStudents /> },
    ],
  },

  // ── مالی ─────────────────────────────────────────────────────────────────
  {
    kind: 'group',
    label: 'مالی',
    icon: <IconPayments />,
    roles: FINANCE_ROLES,
    children: [
      { kind: 'leaf', label: 'پرداخت‌ها', href: '/payments', icon: <IconPayments />, roles: FINANCE_ROLES },
      { kind: 'leaf', label: 'گزارش مالی', href: '/reports/finance', icon: <IconReports />, roles: FINANCE_ROLES },
    ],
  },

  // ── رویدادها و جلسات ─────────────────────────────────────────────────────
  {
    kind: 'group',
    label: 'رویدادها و جلسات',
    icon: <IconEvents />,
    roles: EVENT_ROLES,
    children: [
      { kind: 'leaf', label: 'رویدادها', href: '/events', icon: <IconEvents />, roles: EVENT_ROLES },
    ],
  },

  // ── ارتباطات ─────────────────────────────────────────────────────────────
  {
    kind: 'group',
    label: 'ارتباطات',
    icon: <IconBell />,
    children: [
      { kind: 'leaf', label: 'اعلان‌ها', href: '/notifications', icon: <IconBell /> },
      { kind: 'leaf', label: 'قالب‌های اعلان', href: '/admin/notification-templates', icon: <IconTemplate />, roles: ADMIN_ROLES },
      { kind: 'leaf', label: 'تنظیمات اعلان‌ها', href: '/notification-settings', icon: <IconBellSettings /> },
    ],
  },

  // ── تنظیمات پایه ─────────────────────────────────────────────────────────
  {
    kind: 'group',
    label: 'تنظیمات پایه',
    icon: <IconSettings />,
    children: [
      { kind: 'leaf', label: 'دسته‌بندی‌ها', href: '/taxonomy', icon: <IconTaxonomy />, roles: ADMIN_ROLES },
      { kind: 'leaf', label: 'قالب‌های مدرک', href: '/certificate-templates', icon: <IconCertTemplates />, roles: ADMIN_ROLES },
      { kind: 'leaf', label: 'کاربران', href: '/users', icon: <IconUsers />, roles: ADMIN_ROLES },
      { kind: 'leaf', label: 'اپلیکیشن‌ها', href: '/apps', icon: <IconApps /> },
      { kind: 'leaf', label: 'یکپارچه‌سازی‌ها', href: '/settings/integrations', icon: <IconIntegrations />, roles: ADMIN_ROLES },
    ],
  },

  // ── گزارش‌ها ──────────────────────────────────────────────────────────────
  {
    kind: 'group',
    label: 'گزارش‌ها',
    icon: <IconReports />,
    roles: FINANCE_ROLES,
    children: [
      { kind: 'leaf', label: 'همه گزارش‌ها', href: '/reports', icon: <IconReports />, roles: FINANCE_ROLES },
      { kind: 'leaf', label: 'پیگیری‌ها', href: '/reports/follow-ups', icon: <IconFollowUp />, roles: ADMIN_ROLES },
      { kind: 'leaf', label: 'اقساط معوق', href: '/reports/overdue-installments', icon: <IconOverdue />, roles: FINANCE_ROLES },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasRole(roles: UserRole[] | undefined, userRole: UserRole): boolean {
  if (!roles) return true
  return roles.includes(userRole)
}

/** Returns the set of group labels that contain the current pathname */
function getActiveGroups(pathname: string): Set<string> {
  const active = new Set<string>()
  for (const entry of navConfig) {
    if (entry.kind === 'group') {
      const hasActive = entry.children.some(
        (c) => pathname === c.href || pathname.startsWith(c.href + '/'),
      )
      if (hasActive) active.add(entry.label)
    }
  }
  return active
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Sidebar({ open, onClose, user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Initialise open groups from current route
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => getActiveGroups(pathname))

  // When pathname changes (navigation), open the relevant group
  useEffect(() => {
    const active = getActiveGroups(pathname)
    if (active.size > 0) {
      setOpenGroups((prev) => {
        const next = new Set(prev)
        active.forEach((g) => next.add(g))
        return next
      })
    }
  }, [pathname])

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const displayName = user.profile
    ? `${user.profile.firstName} ${user.profile.lastName}`
    : user.mobile

  const avatarLetter = user.profile?.firstName?.[0] ?? user.mobile[1] ?? 'م'

  const sidebarClasses = [
    'fixed inset-y-0 right-0 z-30 flex flex-col',
    'border-l border-[var(--color-border)] bg-[var(--color-bg-elevated)]',
    'transition-transform duration-200 ease-in-out',
    'lg:static lg:z-auto lg:translate-x-0 lg:transition-none',
    open ? 'translate-x-0' : 'translate-x-full',
  ].join(' ')

  async function handleLogout() {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className={sidebarClasses}
      style={{ width: 'var(--sidebar-width)', top: 'var(--topbar-height)' }}
      aria-label="ناوبری اصلی"
    >
      <nav className="flex-1 overflow-y-auto px-3 py-3" dir="rtl">
        <ul className="space-y-0.5">
          {navConfig.map((entry) => {
            if (entry.kind === 'leaf') {
              if (!hasRole(entry.roles, user.role)) return null
              return (
                <NavLeafItem
                  key={entry.href}
                  item={entry}
                  pathname={pathname}
                  onClose={onClose}
                />
              )
            }

            // Group — filter children by role
            const visibleChildren = entry.children.filter((c) => hasRole(c.roles, user.role))
            // Hide group if user lacks group-level role OR all children are hidden
            if (!hasRole(entry.roles, user.role) || visibleChildren.length === 0) return null

            const isOpen = openGroups.has(entry.label)
            const isGroupActive = visibleChildren.some(
              (c) => pathname === c.href || pathname.startsWith(c.href + '/'),
            )

            return (
              <li key={entry.label}>
                {/* Group header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.label)}
                  className={[
                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors',
                    isGroupActive
                      ? 'font-semibold text-[var(--color-brand-700)] dark:text-[var(--color-brand-400)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]',
                  ].join(' ')}
                  aria-expanded={isOpen}
                >
                  <span
                    className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                      isGroupActive
                        ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-600)] dark:bg-[var(--color-brand-900)]/40 dark:text-[var(--color-brand-400)]'
                        : 'bg-[var(--color-bg-subtle)]',
                    ].join(' ')}
                  >
                    {entry.icon}
                  </span>
                  <span className="flex-1 text-right">{entry.label}</span>
                  {/* Chevron */}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                    className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Children */}
                {isOpen && (
                  <ul className="mb-1 mt-0.5 space-y-0.5 border-r-2 border-[var(--color-border)] pr-3 mr-4">
                    {visibleChildren.map((child) => (
                      <NavLeafItem
                        key={child.href}
                        item={child}
                        pathname={pathname}
                        onClose={onClose}
                        compact
                      />
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User profile section */}
      <div className="border-t border-[var(--color-border)] p-3" dir="rtl">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--color-bg-subtle)]">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))' }}
          >
            {avatarLetter}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{displayName}</div>
            <div className="truncate text-xs text-[var(--color-text-muted)]">{fa.roles[user.role]}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title={fa.auth.logout}
            aria-label={fa.auth.logout}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <IconLogout />
          </button>
        </div>
      </div>
    </aside>
  )
}

// ─── NavLeafItem ──────────────────────────────────────────────────────────────

function NavLeafItem({
  item,
  pathname,
  onClose,
  compact = false,
}: {
  item: NavLeaf
  pathname: string
  onClose: () => void
  compact?: boolean
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

  const iconSize = compact ? 'h-6 w-6' : 'h-8 w-8'
  const textSize = compact ? 'text-xs' : 'text-sm'

  if (isActive) {
    return (
      <li>
        <Link
          href={item.href}
          onClick={onClose}
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${textSize} font-semibold`}
          style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-700)' }}
        >
          <span
            className={`flex ${iconSize} shrink-0 items-center justify-center rounded-lg`}
            style={{ background: 'var(--color-brand-600)', color: '#fff' }}
          >
            {item.icon}
          </span>
          <span className="flex-1">{item.label}</span>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-brand-500)' }} />
        </Link>
      </li>
    )
  }

  return (
    <li>
      <Link
        href={item.href}
        onClick={onClose}
        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${textSize} text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]`}
      >
        <span className={`flex ${iconSize} shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-subtle)]`}>
          {item.icon}
        </span>
        <span className="flex-1">{item.label}</span>
      </Link>
    </li>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity=".5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity=".5" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9" />
    </svg>
  )
}

function IconApplicants() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 17c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 4v6M12 7h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconStudents() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 17c0-2.761 2.462-4.5 6-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 17c0-2.761 2.239-4.5 6-4.5s4 1.739 4 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconCourses() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3h9A1.5 1.5 0 0 1 16 4.5v13l-6-3-6 3V4.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 7h6M7 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconGroups() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="12" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="12" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconEnrollments() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconPayments() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 9h16" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 13h2M9 13h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconApps() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5.5" cy="14.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14.5" cy="14.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 18c0-3.866 3.134-6 7-6s7 2.134 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconReports() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="10" width="3" height="8" rx="1" fill="currentColor" opacity=".7" />
      <rect x="8.5" y="6" width="3" height="12" rx="1" fill="currentColor" opacity=".9" />
      <rect x="14" y="2" width="3" height="16" rx="1" fill="currentColor" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 14l3-4-3-4M16 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconEvents() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 2v4M13 2v4M3 9h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 13h2M11 13h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2a6 6 0 0 0-6 6v3l-1.5 2.5A1 1 0 0 0 3.4 15h13.2a1 1 0 0 0 .9-1.5L16 11V8a6 6 0 0 0-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 15a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconBellSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M8 2.5A5 5 0 0 1 15 7v3l1 2H4l1-2V7a5 5 0 0 1 3-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 15a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="4" r="2.5" fill="currentColor" opacity=".7" />
    </svg>
  )
}

function IconTemplate() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 6h6M7 9h6M7 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconIntegrations() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="5" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="15" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 10h3M10.5 10l2-3.5M10.5 10l2 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconSkills() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2l2.09 4.26L17 7.27l-3.5 3.41.83 4.82L10 13.2l-4.33 2.3.83-4.82L3 7.27l4.91-.71L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function IconCredits() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8h4M12 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconTaxonomy() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h10M3 15h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="15" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconCertTemplates() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="14" r="2.5" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconFollowUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 12v4M8 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 6v2l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconOverdue() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
