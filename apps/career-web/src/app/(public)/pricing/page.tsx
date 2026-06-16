import { CareerCta } from '@/components/CareerCta'

export const metadata = { title: 'قیمت‌گذاری — ایرنو Career Studio' }

const FREE_FEATURES = [
  'سازنده رزومه کامل',
  'قالب‌های رایگان (ATS Friendly, Modern, Technical, Academic)',
  'خروجی HTML آماده چاپ',
  'پروفایل عمومی زنده',
  'بررسی رزومه (نسخه پایه)',
  'پورتفولیو',
  'رودمپ شغلی',
  'تطابق شغلی پایه',
  'واترمارک ایرنو CV روی خروجی',
]

const PRO_FEATURES = [
  'همه امکانات نسخه رایگان',
  'خروجی بدون واترمارک',
  'قالب‌های پریمیوم',
  'بررسی رزومه پیشرفته',
  'پروفایل‌های عمومی متعدد',
  'دامنه اختصاصی',
  'آمار بازدید پروفایل',
  'پشتیبانی اولویت‌دار',
  'دستیار هوش مصنوعی (آینده)',
]

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-[var(--color-text-primary)] mb-4">قیمت‌گذاری</h1>
        <p className="text-xl text-[var(--color-text-secondary)] max-w-xl mx-auto">
          نسخه پایه همیشه رایگان است. نسخه حرفه‌ای به‌زودی.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 max-w-3xl mx-auto">
        {/* Free */}
        <div className="rounded-2xl border-2 border-[var(--color-brand-300)] dark:border-[var(--color-brand-700)] bg-[var(--color-bg-elevated)] p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-[var(--color-brand-500)] to-[var(--color-brand-700)]" />
          <div className="mb-6">
            <div className="text-sm font-semibold text-[var(--color-brand-600)] mb-1">رایگان</div>
            <div className="text-4xl font-extrabold text-[var(--color-text-primary)]">۰ تومان</div>
            <div className="text-sm text-[var(--color-text-muted)] mt-1">برای همیشه رایگان</div>
          </div>
          <ul className="space-y-3 mb-8">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 text-xs">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <CareerCta
            label="شروع رایگان ←"
            studioPath="/studio"
            className="block w-full rounded-xl bg-[var(--color-brand-600)] px-6 py-3.5 text-center text-sm font-bold text-white hover:bg-[var(--color-brand-700)] transition-colors"
          />
        </div>

        {/* Pro */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 relative overflow-hidden opacity-80">
          <div className="absolute top-4 left-4 rounded-full bg-amber-100 dark:bg-amber-900/40 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
            به‌زودی
          </div>
          <div className="mb-6 mt-2">
            <div className="text-sm font-semibold text-[var(--color-text-muted)] mb-1">نسخه حرفه‌ای</div>
            <div className="text-4xl font-extrabold text-[var(--color-text-primary)]">---</div>
            <div className="text-sm text-[var(--color-text-muted)] mt-1">قیمت‌گذاری نهایی نشده</div>
          </div>
          <ul className="space-y-3 mb-8">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--color-text-muted)]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] text-xs">○</span>
                {f}
              </li>
            ))}
          </ul>
          <button
            disabled
            className="block w-full rounded-xl bg-[var(--color-bg-subtle)] px-6 py-3.5 text-center text-sm font-bold text-[var(--color-text-muted)] cursor-not-allowed"
          >
            به‌زودی
          </button>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          تمام قیمت‌گذاری‌ها تأیید نشده‌اند. نسخه رایگان تمام امکانات پایه را دائماً ارائه می‌دهد.
        </p>
      </div>
    </div>
  )
}
