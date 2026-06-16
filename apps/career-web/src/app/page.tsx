import Link from 'next/link'
import { PublicShellServer } from '@/components/PublicShellServer'
import { CareerCta } from '@/components/CareerCta'

const HUB_WEB_URL = process.env['NEXT_PUBLIC_HUB_WEB_URL'] ?? 'http://localhost:3000'

export const metadata = {
  title: 'ایرنو Career Studio — رزومه حرفه‌ای، پروفایل عمومی و مسیر شغلی',
  description:
    'با ایرنو Career Studio رزومه ATS-Friendly بسازید، نمونه‌کارها را نمایش دهید، مهارت‌ها را اثبات کنید و مسیر شغلی خود را بسازید.',
}

// ── Feature definitions ───────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '📄',
    href: '/cv',
    title: 'سازنده رزومه',
    subtitle: 'Irno CV',
    description:
      'رزومه‌ای استاندارد، ATS-Friendly و زیبا بسازید. قالب‌های متنوع فارسی/انگلیسی، ویرایشگر بصری، بخش‌های قابل تنظیم و خروجی HTML آماده چاپ.',
    badges: ['ATS-Friendly', 'فارسی و انگلیسی', 'خروجی HTML'],
    color: 'from-indigo-500 to-indigo-700',
    lightBg: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
  },
  {
    icon: '✅',
    href: '/checker',
    title: 'بررسی رزومه',
    subtitle: 'Resume Checker',
    description:
      'رزومه خود را از نظر ATS، ساختار، کلیدواژه‌ها، دستاوردها و خوانایی بررسی کنید. گزارش دقیق با امتیاز و پیشنهادهای عملی دریافت کنید.',
    badges: ['امتیاز ATS', 'بررسی HR', 'پیشنهاد بهبود'],
    color: 'from-emerald-500 to-emerald-700',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    note: 'دقت parser در حال بهبود است — نتایج را با دانش خود ارزیابی کنید.',
  },
  {
    icon: '🌐',
    href: '/public-profile',
    title: 'پروفایل عمومی زنده',
    subtitle: 'Live Public Resume',
    description:
      'یک لینک عمومی از رزومه‌تان داشته باشید که همیشه به‌روز است. کنترل کنید چه اطلاعاتی نمایش داده شود. PDF دانلودی. بدون نیاز به ارسال فایل.',
    badges: ['لینک زنده', 'PDF دانلود', 'حریم خصوصی'],
    color: 'from-blue-500 to-blue-700',
    lightBg: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  {
    icon: '🗂️',
    href: '/portfolio',
    title: 'پورتفولیو',
    subtitle: 'Portfolio',
    description:
      'پروژه‌ها، case study‌ها و نمونه‌کارهای خود را نمایش دهید. لینک GitHub/Demo، تکنولوژی‌ها، و تصاویر را به راحتی مدیریت کنید.',
    badges: ['GitHub/Demo', 'Case Study', 'پروفایل عمومی'],
    color: 'from-amber-500 to-amber-700',
    lightBg: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  {
    icon: '🗺️',
    href: '/roadmap',
    title: 'رودمپ شغلی',
    subtitle: 'Career Roadmap',
    description:
      'مسیر رشد شغلی خود را دنبال کنید. نقشه راه مهارت‌ها، دوره‌ها و مدارک. پیشرفت خود را ثبت کنید و گام‌های بعدی را بشناسید.',
    badges: ['نقشه مهارتی', 'پیشرفت', 'ارتباط با دوره‌ها'],
    color: 'from-purple-500 to-purple-700',
    lightBg: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  {
    icon: '🎯',
    href: '/job-match',
    title: 'تطابق شغلی',
    subtitle: 'Job Match',
    description:
      'رزومه خود را با آگهی‌های استخدامی مقایسه کنید. کلیدواژه‌های جاافتاده، شکاف مهارتی و پیشنهادهای بهبود رزومه برای آن موقعیت.',
    badges: ['کلیدواژه‌یابی', 'شکاف مهارتی', 'پیشنهاد'],
    color: 'from-rose-500 to-rose-700',
    lightBg: 'bg-rose-50 dark:bg-rose-950/30',
    borderColor: 'border-rose-200 dark:border-rose-800',
    note: 'نسخه پایه — جاب مچ هوشمند در نسخه‌های بعدی.',
  },
]

const TEMPLATES = [
  {
    name: 'ATS Friendly',
    type: 'ats-friendly',
    bestFor: 'شرکت‌های بزرگ و فرآیندهای ATS',
    ats: true,
    rtl: true,
    ltr: true,
    premium: false,
  },
  {
    name: 'Modern Minimal',
    type: 'modern-minimal',
    bestFor: 'طراحان و خلاقان',
    ats: false,
    rtl: true,
    ltr: false,
    premium: false,
  },
  {
    name: 'Technical',
    type: 'technical',
    bestFor: 'مهندسان و توسعه‌دهندگان',
    ats: true,
    rtl: false,
    ltr: true,
    premium: false,
  },
  {
    name: 'Academic',
    type: 'academic',
    bestFor: 'محققان و دانشگاهیان',
    ats: false,
    rtl: true,
    ltr: false,
    premium: false,
  },
]

const STATS = [
  { value: '۸+', label: 'ابزار شغلی' },
  { value: '۴', label: 'قالب رزومه' },
  { value: '۱۰۰٪', label: 'رایگان تا همیشه (بیس)' },
  { value: 'RTL', label: 'پشتیبانی کامل فارسی' },
]

// ── Landing page ──────────────────────────────────────────────────────────────

export default async function LandingPage() {
  return (
    <PublicShellServer>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[var(--color-brand-500)]/15 to-transparent blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-[var(--color-accent-500)]/10 to-transparent blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-4 py-1.5 text-xs font-semibold text-[var(--color-brand-700)] dark:border-[var(--color-brand-800)] dark:bg-[var(--color-brand-900)]/40 dark:text-[var(--color-brand-300)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)] animate-pulse" />
              محصول ایرنو آکادمی — نسخه بتا
            </div>

            <h1 className="text-4xl font-extrabold leading-tight text-[var(--color-text-primary)] sm:text-5xl lg:text-6xl">
              رزومه، پورتفولیو و مسیر شغلی
              <br />
              <span className="bg-gradient-to-l from-[var(--color-brand-500)] to-[var(--color-brand-700)] bg-clip-text text-transparent">
                حرفه‌ای بسازید
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-[var(--color-text-secondary)] sm:text-xl">
              ایرنو Career Studio مجموعه‌ای کامل از ابزارهای شغلی است.
              <br className="hidden sm:block" />
              رزومه ATS-Friendly بسازید، مهارت‌ها را اثبات کنید، پروفایل عمومی داشته باشید
              <br className="hidden sm:block" />
              و با آگهی‌های شغلی تطابق پیدا کنید.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <CareerCta
                label="ساخت رزومه حرفه‌ای ←"
                studioPath="/studio"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[var(--color-brand-700)] to-[var(--color-brand-500)] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[var(--color-brand-500)]/25 hover:opacity-90 transition-opacity"
              />
              <Link
                href="/checker"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-8 py-3.5 text-base font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                بررسی رزومه
              </Link>
            </div>

            {/* Trust hints */}
            <p className="mt-6 text-sm text-[var(--color-text-muted)]">
              رایگان برای همه · بدون نیاز به کارت بانکی · اتصال با حساب ایرنو
            </p>
          </div>

          {/* Mock resume preview */}
          <div className="mt-16 mx-auto max-w-4xl">
            <div className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-2xl overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <div className="mr-4 flex-1 max-w-xs rounded-md bg-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
                  irno.cv/u/sara-ahmadi
                </div>
              </div>
              {/* Mock resume content */}
              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="h-7 w-48 rounded-lg bg-gradient-to-l from-[var(--color-brand-600)] to-[var(--color-brand-400)] opacity-80" />
                    <div className="mt-2 h-4 w-64 rounded bg-[var(--color-bg-subtle)]" />
                    <div className="mt-1 h-3 w-48 rounded bg-[var(--color-bg-subtle)]" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-6 w-16 rounded-full bg-green-100 dark:bg-green-900/40" />
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">ATS ✓</div>
                  </div>
                </div>
                <div className="space-y-4">
                  {['خلاصه حرفه‌ای', 'سابقه کاری', 'مهارت‌ها', 'تحصیلات'].map((s, i) => (
                    <div key={s}>
                      <div className="h-4 w-28 rounded bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)]/40 mb-2" />
                      <div className="space-y-1.5">
                        {Array.from({ length: i === 2 ? 1 : 2 }).map((_, j) => (
                          <div
                            key={j}
                            className="h-3 rounded bg-[var(--color-bg-subtle)]"
                            style={{ width: `${65 + Math.random() * 30}%` }}
                          />
                        ))}
                        {i === 2 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {['React', 'TypeScript', 'Next.js', 'Node.js', 'Python'].map((sk) => (
                              <span key={sk} className="rounded-full bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)]/40 px-2 py-0.5 text-xs text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)]">
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Score bar */}
                <div className="mt-6 flex items-center gap-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50 text-sm font-bold text-green-700 dark:text-green-300">
                    ۸۴
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-green-700 dark:text-green-300">امتیاز کلی رزومه</div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-green-200 dark:bg-green-900">
                      <div className="h-full rounded-full bg-green-500" style={{ width: '84%' }} />
                    </div>
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">ATS آماده</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-extrabold text-[var(--color-brand-600)]">{stat.value}</div>
                <div className="mt-1 text-sm text-[var(--color-text-muted)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[var(--color-text-primary)] sm:text-4xl">
              همه ابزارهایی که نیاز دارید
            </h2>
            <p className="mt-4 text-lg text-[var(--color-text-secondary)]">
              از ساخت رزومه تا پروفایل عمومی، پورتفولیو و جاب مچ — یک پلتفرم برای مسیر شغلی حرفه‌ای.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Link
                key={feature.href}
                href={feature.href}
                className={[
                  'group relative flex flex-col rounded-2xl border p-6 transition-all duration-200',
                  'hover:shadow-lg hover:-translate-y-0.5',
                  feature.lightBg,
                  feature.borderColor,
                ].join(' ')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-[var(--color-bg-elevated)] shadow-sm text-2xl">
                    {feature.icon}
                  </div>
                  <div className={`rounded-full bg-gradient-to-l ${feature.color} px-3 py-1 text-xs font-semibold text-white`}>
                    {feature.subtitle}
                  </div>
                </div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed flex-1">{feature.description}</p>
                {feature.note && (
                  <p className="mt-3 text-xs text-[var(--color-text-muted)] italic border-t border-current/10 pt-2">{feature.note}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {feature.badges.map((b) => (
                    <span
                      key={b}
                      className="inline-flex items-center rounded-full border border-current/20 bg-white/50 dark:bg-[var(--color-bg-elevated)]/50 px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]"
                    >
                      {b}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center text-sm font-semibold text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] group-hover:gap-2 transition-all">
                  بیشتر بدانید
                  <span className="mr-1 transition-transform group-hover:-translate-x-1">←</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Templates showcase ── */}
      <section className="py-20 bg-[var(--color-bg-elevated)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div>
              <h2 className="text-3xl font-extrabold text-[var(--color-text-primary)]">قالب‌های حرفه‌ای</h2>
              <p className="mt-2 text-[var(--color-text-secondary)]">
                انتخاب از بین قالب‌های طراحی‌شده برای موقعیت‌های مختلف
              </p>
            </div>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] transition-colors shrink-0"
            >
              مشاهده همه قالب‌ها ←
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATES.map((t) => (
              <div
                key={t.name}
                className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-5 hover:border-[var(--color-brand-300)] hover:shadow-md transition-all duration-200"
              >
                {/* Template mockup */}
                <div className="mb-4 h-36 rounded-xl border border-[var(--color-border)] bg-white dark:bg-[var(--color-bg-elevated)] p-3 overflow-hidden">
                  <div className="space-y-1.5">
                    <div className="h-4 w-3/4 rounded bg-[var(--color-brand-200)] dark:bg-[var(--color-brand-800)]" />
                    <div className="h-2.5 w-1/2 rounded bg-[var(--color-bg-subtle)]" />
                    <div className="mt-2 h-1.5 w-full rounded bg-[var(--color-bg-subtle)]" />
                    <div className="h-1.5 w-4/5 rounded bg-[var(--color-bg-subtle)]" />
                    <div className="mt-2 h-2.5 w-2/3 rounded bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)]/40" />
                    <div className="h-1.5 w-full rounded bg-[var(--color-bg-subtle)]" />
                    <div className="h-1.5 w-3/4 rounded bg-[var(--color-bg-subtle)]" />
                    <div className="mt-2 flex gap-1">
                      {['', '', ''].map((_, i) => (
                        <div key={i} className="h-4 w-12 rounded bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)]/30" />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="font-semibold text-sm text-[var(--color-text-primary)]">{t.name}</div>
                <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">{t.bestFor}</div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {t.ats && (
                    <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs text-green-700 dark:text-green-400 font-medium">ATS</span>
                  )}
                  {t.rtl && (
                    <span className="rounded-full bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)]/30 px-2 py-0.5 text-xs text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)]">RTL</span>
                  )}
                  {t.ltr && (
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400">LTR</span>
                  )}
                  <span className="rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                    {t.premium ? 'پریمیوم' : 'رایگان'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[var(--color-text-primary)]">در ۳ مرحله شروع کنید</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                step: '۱',
                icon: '👤',
                title: 'ثبت‌نام رایگان',
                desc: 'با شماره موبایل یا حساب ایرنو وارد شوید. بدون نیاز به اطلاعات بانکی.',
              },
              {
                step: '۲',
                icon: '✍️',
                title: 'رزومه بسازید',
                desc: 'قالب دلخواه را انتخاب کنید. اطلاعات حرفه‌ای، تجربه، مهارت‌ها و پروژه‌ها را وارد کنید.',
              },
              {
                step: '۳',
                icon: '🚀',
                title: 'به اشتراک بگذارید',
                desc: 'لینک رزومه عمومی داشته باشید. PDF خروجی بگیرید. با کارفرماها به اشتراک بگذارید.',
              },
            ].map((s) => (
              <div key={s.step} className="relative text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-bg-elevated)] border-2 border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)] shadow-sm text-3xl">
                  {s.icon}
                </div>
                <div className="absolute -top-2 right-1/2 translate-x-8 h-6 w-6 rounded-full bg-[var(--color-brand-600)] text-white text-xs font-bold flex items-center justify-center">
                  {s.step}
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">{s.title}</h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Irno students ── */}
      <section className="py-20 border-y border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)]/40 px-4 py-1.5 text-xs font-semibold text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)] mb-6">
                ویژه دانشجویان ایرنو
              </div>
              <h2 className="text-3xl font-extrabold text-[var(--color-text-primary)] mb-4">
                مهارت‌ها و مدارک ایرنو
                <br />
                مستقیم وارد رزومه می‌شوند
              </h2>
              <p className="text-[var(--color-text-secondary)] leading-relaxed mb-6">
                دانشجویان ایرنو آکادمی می‌توانند مهارت‌های تأییدشده، اعتبارنامه‌های داخلی و
                مدارک رسمی خود را از ایرنو هاب مستقیماً به رزومه‌شان وارد کنند.
                نیازی به تایپ مجدد نیست.
              </p>
              <ul className="space-y-3">
                {[
                  'وارد کردن مهارت‌های تأیید‌شده از هاب',
                  'اتصال مدارک رسمی ایرنو به رزومه',
                  'نمایش دوره‌های گذرانده‌شده',
                  'لینک صفحه تأیید مدرک',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex gap-3">
                <CareerCta
                  label="شروع رایگان"
                  studioPath="/studio"
                  className="inline-flex items-center rounded-xl bg-[var(--color-brand-600)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors"
                />
                <a
                  href={HUB_WEB_URL}
                  className="inline-flex items-center rounded-xl border border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                >
                  ایرنو هاب ←
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '🎓', label: 'مهارت‌های تأییدشده', count: 'از هاب' },
                { icon: '📜', label: 'مدارک رسمی', count: 'با QR کد' },
                { icon: '🏆', label: 'اعتبارنامه', count: 'داخلی ایرنو' },
                { icon: '🔗', label: 'تأیید عمومی', count: 'لینک مستقیم' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 text-center"
                >
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">{item.label}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{item.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[var(--color-brand-800)] to-[var(--color-brand-600)] px-8 py-16 text-center shadow-2xl">
            <div className="pointer-events-none absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white blur-3xl" />
              <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-white blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                همین الان شروع کنید
              </h2>
              <p className="mt-4 text-lg text-indigo-200">
                رایگان · بدون کارت بانکی · ثبت‌نام در ۳۰ ثانیه
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <CareerCta
                  label="ساخت رزومه رایگان ←"
                  studioPath="/studio"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-[var(--color-brand-700)] shadow-lg hover:bg-indigo-50 transition-colors"
                />
                <Link
                  href="/checker"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  بررسی رزومه فعلی
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicShellServer>
  )
}
