import Link from 'next/link'
import { getCareerProfile, listResumes, listPortfolioProjects } from '@/lib/api'

export default async function DashboardPage() {
  const [profile, resumes, projects] = await Promise.all([
    getCareerProfile(),
    listResumes(),
    listPortfolioProjects(),
  ])

  const displayName = profile?.displayName ?? 'کاربر'
  const resumeCount = resumes?.total ?? 0
  const projectCount = projects?.total ?? 0

  const quickActions = [
    {
      href: '/resumes/new',
      label: 'ساخت رزومه جدید',
      description: 'رزومه حرفه‌ای بسازید',
      icon: '📄',
      color: 'var(--color-brand-600)',
    },
    {
      href: '/studio/checker',
      label: 'بررسی رزومه',
      description: 'نقاط ضعف رزومه را بیابید',
      icon: '✅',
      color: 'var(--color-success)',
    },
    {
      href: '/profile',
      label: 'پروفایل عمومی',
      description: 'پروفایل خود را ویرایش کنید',
      icon: '👤',
      color: 'var(--color-warning)',
    },
    {
      href: '/studio/portfolio',
      label: 'پورتفولیو',
      description: 'پروژه‌های خود را نمایش دهید',
      icon: '🗂️',
      color: 'var(--color-text-secondary)',
    },
  ]

  const features = [
    {
      title: 'سازنده رزومه',
      description: 'رزومه حرفه‌ای با قالب‌های متنوع فارسی و انگلیسی بسازید.',
      badge: null,
      href: '/resumes',
    },
    {
      title: 'بررسی رزومه',
      description: 'رزومه خود را از نظر ATS، ساختار، کلیدواژه و کامل‌بودن بررسی کنید.',
      badge: null,
      href: '/studio/checker',
    },
    {
      title: 'پورتفولیو',
      description: 'پروژه‌ها و دستاوردهای خود را به صورت عمومی به اشتراک بگذارید.',
      badge: null,
      href: '/studio/portfolio',
    },
    {
      title: 'مسیر شغلی',
      description: 'نقشه راه یادگیری و رشد شغلی خود را دنبال کنید.',
      badge: 'به‌زودی',
      href: '/studio/roadmap',
    },
    {
      title: 'تطابق شغلی',
      description: 'رزومه خود را با آگهی‌های استخدامی مقایسه کنید.',
      badge: 'هوش مصنوعی — نسخه بعدی',
      href: '/studio/job-match',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome card */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              خوش آمدید، {displayName}
            </h1>
            {profile?.headline && (
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{profile.headline}</p>
            )}
          </div>
          <div className="flex gap-3">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-2 text-center">
              <div className="text-lg font-bold text-[var(--color-text-primary)]">{resumeCount}</div>
              <div className="text-xs text-[var(--color-text-muted)]">رزومه</div>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-2 text-center">
              <div className="text-lg font-bold text-[var(--color-text-primary)]">{projectCount}</div>
              <div className="text-xs text-[var(--color-text-muted)]">پروژه</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
          دسترسی سریع
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <div className="text-2xl mb-2">{action.icon}</div>
              <div className="text-sm font-medium text-[var(--color-text-primary)]">{action.label}</div>
              <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">{action.description}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Feature cards */}
      <div>
        <h2 className="mb-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
          امکانات Career Studio
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">{f.title}</div>
                {f.badge && (
                  <span className="inline-flex items-center rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)] border border-[var(--color-border)] shrink-0">
                    {f.badge}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {f.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
