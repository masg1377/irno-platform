import Link from 'next/link'
import { CareerCta } from '@/components/CareerCta'

export const metadata = { title: 'رودمپ شغلی — ایرنو Career Studio' }

export default function RoadmapProductPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-3xl mb-6">🗺️</div>
        <h1 className="text-4xl font-extrabold text-[var(--color-text-primary)] mb-4">رودمپ شغلی</h1>
        <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed">
          مسیر رشد شغلی خود را با نقشه‌راه‌های تخصصی ایرنو دنبال کنید.
          مشابه roadmap.sh اما با محتوای ایرنو و اتصال به مهارت‌ها، دوره‌ها و مدارک.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 px-4 py-1.5 text-xs text-purple-700 dark:text-purple-400">
          🔜 نسخه کامل در حال توسعه است
        </div>
        <div className="mt-8">
          <CareerCta
            label="ثبت‌نام رایگان ←"
            studioPath="/studio"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-8 py-3.5 text-base font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-16">
        {[
          { icon: '📍', title: 'گره‌های مهارتی', desc: 'هر مهارت، ابزار یا مفهوم به‌عنوان یک گره در نقشه راه نمایش داده می‌شود.' },
          { icon: '📊', title: 'ردیابی پیشرفت', desc: 'پیشرفت خود را در هر نقشه راه علامت‌گذاری و ردیابی کنید.' },
          { icon: '🎓', title: 'اتصال به دوره‌ها', desc: 'هر گره به دوره‌های مرتبط ایرنو آکادمی متصل است.' },
          { icon: '📜', title: 'اتصال به مدارک', desc: 'مدارک اخذ‌شده در طول مسیر به رزومه شما اضافه می‌شوند.' },
          { icon: '🌍', title: 'فارسی و انگلیسی', desc: 'رودمپ‌ها هم به فارسی و هم به انگلیسی قابل نمایش هستند.' },
          { icon: '🔮', title: 'توصیه گام بعدی', desc: 'بر اساس موقعیت فعلی شما، گام بعدی پیشنهاد می‌شود.' },
        ].map((f) => (
          <div key={f.title} className="flex gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <div className="text-2xl shrink-0">{f.icon}</div>
            <div>
              <div className="font-semibold text-sm text-[var(--color-text-primary)] mb-1">{f.title}</div>
              <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
