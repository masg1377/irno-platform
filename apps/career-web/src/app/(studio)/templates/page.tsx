import Link from 'next/link'
import { CareerCta } from '@/components/CareerCta'

export const metadata = { title: 'قالب‌های رزومه — ایرنو Career Studio' }

const TEMPLATES = [
  { name: 'ATS Friendly', key: 'ats-friendly', bestFor: 'شرکت‌های بزرگ و فرآیندهای ATS', ats: true, rtl: true, ltr: true, premium: false, desc: 'بهترین انتخاب برای ارسال آنلاین. ساختار ساده، قابل خواندن توسط ATS، پشتیبانی از فارسی و انگلیسی.' },
  { name: 'Modern Minimal', key: 'modern-minimal', bestFor: 'طراحان، خلاقان، استارتاپ‌ها', ats: false, rtl: true, ltr: false, premium: false, desc: 'طراحی مدرن و تمیز. تأکید بر پروژه‌ها و مهارت‌ها. مناسب برای ارسال مستقیم (نه ATS).' },
  { name: 'Technical', key: 'technical', bestFor: 'مهندسان، توسعه‌دهندگان، DevOps', ats: true, rtl: false, ltr: true, premium: false, desc: 'بهینه‌شده برای نمایش مهارت‌های فنی، پروژه‌ها و stack تکنولوژی. انگلیسی (LTR).' },
  { name: 'Academic', key: 'academic', bestFor: 'محققان، دانشگاهیان، پزشکان', ats: false, rtl: true, ltr: false, premium: false, desc: 'ساختار آکادمیک با تأکید بر تحصیلات، انتشارات و دستاوردهای علمی. فارسی (RTL).' },
]

export default function TemplatesProductPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)]/30 text-3xl mb-6">🎨</div>
        <h1 className="text-4xl font-extrabold text-[var(--color-text-primary)] mb-4">قالب‌های رزومه</h1>
        <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed">
          قالب‌های حرفه‌ای طراحی‌شده برای موقعیت‌های مختلف شغلی.
          پشتیبانی از فارسی (RTL)، انگلیسی (LTR) و ATS.
        </p>
        <div className="mt-8">
          <CareerCta
            label="انتخاب قالب و شروع ←"
            studioPath="/studio"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-8 py-3.5 text-base font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {TEMPLATES.map((t) => (
          <div key={t.key} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden hover:border-[var(--color-brand-300)] hover:shadow-lg transition-all duration-200">
            {/* Mockup */}
            <div className="h-48 bg-[var(--color-bg-subtle)] p-5 border-b border-[var(--color-border)]">
              <div className="h-full rounded-xl border border-[var(--color-border)] bg-white dark:bg-[var(--color-bg-elevated)] p-4 overflow-hidden">
                <div className="space-y-2">
                  <div className="h-5 w-2/3 rounded bg-[var(--color-brand-200)] dark:bg-[var(--color-brand-800)]" />
                  <div className="h-3 w-1/2 rounded bg-[var(--color-bg-subtle)]" />
                  <div className="mt-3 h-2 w-full rounded bg-[var(--color-bg-subtle)]" />
                  <div className="h-2 w-4/5 rounded bg-[var(--color-bg-subtle)]" />
                  <div className="mt-3 h-3 w-2/5 rounded bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)]/40" />
                  <div className="h-2 w-full rounded bg-[var(--color-bg-subtle)]" />
                  <div className="flex gap-1.5 mt-2">
                    {['', '', ''].map((_, i) => (<div key={i} className="h-5 w-14 rounded bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)]/30" />))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-[var(--color-text-primary)]">{t.name}</h3>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${t.premium ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'}`}>
                  {t.premium ? 'پریمیوم' : 'رایگان'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">مناسب برای: {t.bestFor}</p>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">{t.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {t.ats && <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">ATS ✓</span>}
                {t.rtl && <span className="rounded-full bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)]/30 px-2.5 py-0.5 text-xs text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)]">فارسی RTL</span>}
                {t.ltr && <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs text-slate-600 dark:text-slate-400">English LTR</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)] bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)]/20 p-6 text-center">
        <h3 className="font-bold text-[var(--color-brand-800)] dark:text-[var(--color-brand-300)] mb-2">قالب‌های بیشتر — به‌زودی</h3>
        <p className="text-sm text-[var(--color-brand-700)] dark:text-[var(--color-brand-400)]">قالب‌های پریمیوم، تخصصی و سفارشی در نسخه‌های بعدی اضافه می‌شوند.</p>
      </div>
    </div>
  )
}
