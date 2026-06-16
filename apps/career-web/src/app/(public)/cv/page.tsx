import Link from 'next/link'

import { CareerCta } from '@/components/CareerCta'

export const metadata = {
  title: 'ایرنو CV — سازنده رزومه حرفه‌ای ATS-Friendly',
  description: 'با ایرنو CV رزومه استاندارد، ATS-Friendly و حرفه‌ای بسازید. قالب‌های فارسی و انگلیسی، ویرایشگر بصری، بخش‌های قابل تنظیم.',
}

const RESUME_SECTIONS = [
  { name: 'خلاصه حرفه‌ای', icon: '📝', desc: 'معرفی تخصصی و هدف شغلی' },
  { name: 'سابقه کاری', icon: '💼', desc: 'تجربه‌های کاری با bullet points' },
  { name: 'مهارت‌ها', icon: '⚡', desc: 'مهارت‌های فنی و نرم گروه‌بندی‌شده' },
  { name: 'تحصیلات', icon: '🎓', desc: 'مدارک تحصیلی و دانشگاه‌ها' },
  { name: 'پروژه‌ها', icon: '🚀', desc: 'پروژه‌های مهم با لینک و تکنولوژی' },
  { name: 'مدارک و گواهی‌نامه', icon: '📜', desc: 'گواهی‌نامه‌های حرفه‌ای' },
  { name: 'زبان‌ها', icon: '🌐', desc: 'زبان‌های انسانی با سطح مهارت' },
  { name: 'لینک‌ها', icon: '🔗', desc: 'GitHub، LinkedIn، وب‌سایت' },
]

export default function CvProductPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="text-center mb-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)] bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)]/40 px-4 py-1.5 text-xs font-semibold text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)] mb-6">
          محصول اصلی Career Studio
        </div>
        <h1 className="text-4xl font-extrabold text-[var(--color-text-primary)] sm:text-5xl mb-6">
          ایرنو CV
          <br />
          <span className="bg-gradient-to-l from-[var(--color-brand-500)] to-[var(--color-brand-700)] bg-clip-text text-transparent text-3xl sm:text-4xl">
            سازنده رزومه حرفه‌ای
          </span>
        </h1>
        <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed">
          رزومه‌ای استاندارد، زیبا و ATS-Friendly بسازید.
          ویرایشگر بصری ۳ پنلی، قالب‌های متنوع، خروجی HTML آماده چاپ.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <CareerCta
            label="ساخت رزومه رایگان ←"
            studioPath="/studio"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-8 py-4 text-base font-bold text-white shadow-lg hover:bg-[var(--color-brand-700)] transition-colors"
          />
          <Link
            href="/checker"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--color-border)] px-8 py-4 text-base font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            بررسی رزومه فعلی
          </Link>
        </div>
      </div>

      {/* Editor features */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-10">ویرایشگر بصری ۳ پنلی</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              panel: 'پنل چپ',
              icon: '📋',
              title: 'ساختار',
              desc: 'فهرست بخش‌ها. جابجایی با دکمه بالا/پایین. مخفی/نمایش. تغییر نام. کپی. حذف.',
            },
            {
              panel: 'پنل مرکز',
              icon: '✏️',
              title: 'ویرایش',
              desc: 'ویرایش محتوای هر بخش با فرم‌های ساختاریافته. بدون JSON خام. راهنمای ATS inline.',
            },
            {
              panel: 'پنل راست',
              icon: '👁️',
              title: 'پیش‌نمایش زنده',
              desc: 'پیش‌نمایش A4 واقعی. رنگ‌بندی، فونت و فاصله‌بندی قابل تنظیم. واترمارک در نسخه رایگان.',
            },
          ].map((p) => (
            <div key={p.panel} className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6">
              <div className="absolute -top-3 right-6 rounded-full bg-[var(--color-brand-600)] px-3 py-0.5 text-xs font-semibold text-white">
                {p.panel}
              </div>
              <div className="text-3xl mb-4 mt-2">{p.icon}</div>
              <h3 className="font-bold text-[var(--color-text-primary)] mb-2">{p.title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sections */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-10">بخش‌های قابل اضافه</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RESUME_SECTIONS.map((s) => (
            <div key={s.name} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 text-center hover:border-[var(--color-brand-300)] transition-colors">
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-xs font-semibold text-[var(--color-text-primary)]">{s.name}</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-snug">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ATS */}
      <section className="mb-20 rounded-2xl bg-gradient-to-l from-[var(--color-brand-50)] to-[var(--color-bg-elevated)] dark:from-[var(--color-brand-900)]/20 dark:to-[var(--color-bg-elevated)] border border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)] p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30 text-2xl">🤖</div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">ATS-Friendly چیست؟</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Applicant Tracking System</p>
          </div>
        </div>
        <p className="text-[var(--color-text-secondary)] leading-relaxed mb-4">
          بیشتر شرکت‌های بزرگ از سیستم‌های ATS برای غربال اولیه رزومه‌ها استفاده می‌کنند.
          رزومه‌هایی که ATS نتواند بخواند به طور خودکار حذف می‌شوند — قبل از اینکه یک انسان ببیند.
        </p>
        <ul className="space-y-2">
          {[
            'ساختار ساده بدون column‌های پیچیده',
            'فونت‌های استاندارد و خوانا',
            'عناوین بخش‌ها واضح و استاندارد',
            'بدون تصویر، نمودار یا جدول پیچیده',
            'قالب ATS Friendly ایرنو CV بهینه‌شده برای این سیستم‌هاست',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <span className="text-green-500">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Export */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-10">خروجی و به اشتراک‌گذاری</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: '🌐', title: 'HTML آماده چاپ', desc: 'خروجی HTML با CSS کامل. در مرورگر باز کنید و Print → Save as PDF بگیرید.' },
            { icon: '🔗', title: 'لینک عمومی زنده', desc: 'یک لینک دائمی از رزومه‌تان. هر بار که رزومه را آپدیت کنید، لینک هم آپدیت می‌شود.' },
            { icon: '💧', title: 'واترمارک رایگان', desc: 'نسخه رایگان واترمارک ایرنو CV دارد. نسخه پریمیوم (به‌زودی) بدون واترمارک.' },
          ].map((e) => (
            <div key={e.title} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
              <div className="text-2xl mb-3">{e.icon}</div>
              <div className="font-semibold text-sm text-[var(--color-text-primary)] mb-1">{e.title}</div>
              <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{e.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="rounded-3xl bg-gradient-to-l from-[var(--color-brand-700)] to-[var(--color-brand-500)] p-10 text-center">
        <h2 className="text-2xl font-extrabold text-white mb-3">همین الان شروع کنید</h2>
        <p className="text-indigo-200 mb-8">رایگان · بدون کارت بانکی · ثبت‌نام در ۳۰ ثانیه</p>
        <CareerCta
          label="ساخت اولین رزومه ←"
          studioPath="/studio"
          className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-base font-bold text-[var(--color-brand-700)] hover:bg-indigo-50 transition-colors"
        />
      </div>
    </div>
  )
}
