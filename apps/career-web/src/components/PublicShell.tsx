'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const HUB_WEB_URL = process.env['NEXT_PUBLIC_HUB_WEB_URL'] ?? 'http://localhost:3000'
const CAREER_WEB_URL = process.env['NEXT_PUBLIC_CAREER_WEB_URL'] ?? 'http://localhost:3002'

// Full nav for guests (all product pages)
const GUEST_NAV_LINKS = [
  { href: '/checker', label: 'بررسی رزومه' },
  { href: '/templates', label: 'قالب‌ها' },
  { href: '/public-profile', label: 'پروفایل عمومی' },
  { href: '/portfolio', label: 'پورتفولیو' },
  { href: '/roadmap', label: 'رودمپ' },
  { href: '/job-match', label: 'جاب مچ' },
  { href: '/pricing', label: 'قیمت‌گذاری' },
]

// Compact nav for logged-in users — avoids header wrapping
const AUTH_NAV_LINKS = [
  { href: '/checker', label: 'بررسی رزومه' },
  { href: '/templates', label: 'قالب‌ها' },
  { href: '/roadmap', label: 'رودمپ' },
  { href: '/pricing', label: 'قیمت‌گذاری' },
]

interface PublicShellProps {
  children: React.ReactNode
  /**
   * Read server-side from irno_at cookie by PublicShellServer wrapper.
   * false (default) = not logged in → show login/register CTAs.
   * true = logged in → show studio navigation CTAs instead.
   */
  isLoggedIn?: boolean
}

export function PublicShell({ children, isLoggedIn = false }: PublicShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('irno-theme', isDark ? 'dark' : 'light')
  }

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 10) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ── */}
      <header
        className={[
          'sticky top-0 z-40 transition-all duration-200',
          scrolled
            ? 'border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]/95 backdrop-blur-md shadow-sm'
            : 'bg-transparent',
        ].join(' ')}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-brand-600)] to-[var(--color-brand-800)] text-white font-bold text-sm shadow-md">
              CV
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">
                ایرنو Career Studio
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] leading-tight tracking-wide uppercase">
                by Irno Academy
              </div>
            </div>
            <div className="sm:hidden text-sm font-bold text-[var(--color-text-primary)]">
              ایرنو CV
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {(isLoggedIn ? AUTH_NAV_LINKS : GUEST_NAV_LINKS).map((link) => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    'rounded-lg px-3 py-1.5 text-sm transition-colors',
                    active
                      ? 'text-[var(--color-brand-600)] font-semibold bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)]/30'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]',
                  ].join(' ')}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* CTAs — auth-aware */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleTheme}
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] transition-colors"
              title="تغییر تم"
            >
              <IconSun />
            </button>

            {isLoggedIn ? (
              /* ── Logged-in CTAs ── */
              <>
                <a
                  href="/resumes"
                  className="hidden sm:inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  رزومه‌های من
                </a>
                <a
                  href="/studio"
                  className="inline-flex items-center rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-700)] transition-colors"
                >
                  ورود به استودیو ←
                </a>
              </>
            ) : (
              /* ── Guest CTAs ── */
              <>
                <a
                  href={`${HUB_WEB_URL}/auth/login?app=career&returnTo=${encodeURIComponent(`${CAREER_WEB_URL}/studio`)}`}
                  className="hidden sm:inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  ورود
                </a>
                <a
                  href={`${HUB_WEB_URL}/auth/register?app=career&returnTo=${encodeURIComponent(`${CAREER_WEB_URL}/studio`)}`}
                  className="inline-flex items-center rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-700)] transition-colors"
                >
                  شروع رایگان
                </a>
              </>
            )}

            {/* Mobile menu button */}
            <button
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <IconX /> : <IconMenu />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 pb-4 pt-3">
            <nav className="space-y-1">
              {(isLoggedIn ? AUTH_NAV_LINKS : GUEST_NAV_LINKS).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={[
                    'block rounded-lg px-3 py-2.5 text-sm transition-colors',
                    pathname === link.href
                      ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] font-medium dark:bg-[var(--color-brand-900)]/30'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]',
                  ].join(' ')}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Mobile auth CTAs — auth-aware */}
            <div className="mt-4 flex gap-2 border-t border-[var(--color-border)] pt-4">
              {isLoggedIn ? (
                <>
                  <a
                    href="/resumes"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-center text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                  >
                    رزومه‌های من
                  </a>
                  <a
                    href="/studio"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors"
                  >
                    ورود به استودیو
                  </a>
                </>
              ) : (
                <>
                  <a
                    href={`${HUB_WEB_URL}/auth/login?app=career&returnTo=${encodeURIComponent(`${CAREER_WEB_URL}/studio`)}`}
                    className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-center text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                  >
                    ورود
                  </a>
                  <a
                    href={`${HUB_WEB_URL}/auth/register?app=career&returnTo=${encodeURIComponent(`${CAREER_WEB_URL}/studio`)}`}
                    className="flex-1 rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors"
                  >
                    ثبت‌نام رایگان
                  </a>
                </>
              )}
            </div>
            <button
              onClick={() => { setMenuOpen(false); toggleTheme() }}
              className="mt-2 w-full rounded-lg px-3 py-2 text-right text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              تغییر تم (روشن / تاریک)
            </button>
          </div>
        )}
      </header>

      {/* ── Page content ── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-brand-600)] to-[var(--color-brand-800)] text-white font-bold text-xs">
                  CV
                </div>
                <span className="font-bold text-[var(--color-text-primary)]">ایرنو Career Studio</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                پلتفرم جامع رزومه، پورتفولیو و مسیر شغلی حرفه‌ای. محصولی از ایرنو آکادمی.
              </p>
            </div>

            {/* Products */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">محصولات</h4>
              <ul className="space-y-2 text-sm">
                {[
                  { href: '/cv', label: 'ایرنو CV' },
                  { href: '/checker', label: 'بررسی رزومه' },
                  { href: '/templates', label: 'قالب‌ها' },
                  { href: '/public-profile', label: 'پروفایل عمومی' },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[var(--color-text-secondary)] hover:text-[var(--color-brand-600)] transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Features */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">امکانات</h4>
              <ul className="space-y-2 text-sm">
                {[
                  { href: '/portfolio', label: 'پورتفولیو' },
                  { href: '/roadmap', label: 'رودمپ شغلی' },
                  { href: '/job-match', label: 'جاب مچ' },
                  { href: '/pricing', label: 'قیمت‌گذاری' },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[var(--color-text-secondary)] hover:text-[var(--color-brand-600)] transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ecosystem — auth-aware */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {isLoggedIn ? 'حساب من' : 'اکوسیستم ایرنو'}
              </h4>
              <ul className="space-y-2 text-sm">
                {(isLoggedIn
                  ? [
                      { href: '/studio', label: 'استودیو' },
                      { href: '/resumes', label: 'رزومه‌های من' },
                      { href: '/settings', label: 'تنظیمات پروفایل' },
                      { href: HUB_WEB_URL, label: 'ایرنو هاب' },
                    ]
                  : [
                      { href: HUB_WEB_URL, label: 'ایرنو هاب' },
                      { href: `${HUB_WEB_URL}/portal`, label: 'پورتال دانشجویی' },
                      { href: `${HUB_WEB_URL}/auth/register`, label: 'ثبت‌نام ایرنو' },
                    ]
                ).map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="text-[var(--color-text-secondary)] hover:text-[var(--color-brand-600)] transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--color-border)] pt-6">
            <p className="text-xs text-[var(--color-text-muted)]">
              © {new Date().getFullYear()} ایرنو آکادمی. تمامی حقوق محفوظ است.
            </p>
            <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
              <span>ساخته‌شده با ❤️ برای متخصصان ایرانی</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconMenu() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <line x1="3" y1="6" x2="17" y2="6" strokeLinecap="round" />
      <line x1="3" y1="10" x2="17" y2="10" strokeLinecap="round" />
      <line x1="3" y1="14" x2="17" y2="14" strokeLinecap="round" />
    </svg>
  )
}

function IconX() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <line x1="5" y1="5" x2="15" y2="15" strokeLinecap="round" />
      <line x1="15" y1="5" x2="5" y2="15" strokeLinecap="round" />
    </svg>
  )
}

function IconSun() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <circle cx="10" cy="10" r="3.5" />
      <line x1="10" y1="2" x2="10" y2="4" strokeLinecap="round" />
      <line x1="10" y1="16" x2="10" y2="18" strokeLinecap="round" />
      <line x1="2" y1="10" x2="4" y2="10" strokeLinecap="round" />
      <line x1="16" y1="10" x2="18" y2="10" strokeLinecap="round" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" strokeLinecap="round" />
      <line x1="14.36" y1="14.36" x2="15.78" y2="15.78" strokeLinecap="round" />
      <line x1="14.36" y1="5.64" x2="15.78" y2="4.22" strokeLinecap="round" />
      <line x1="4.22" y1="15.78" x2="5.64" y2="14.36" strokeLinecap="round" />
    </svg>
  )
}
