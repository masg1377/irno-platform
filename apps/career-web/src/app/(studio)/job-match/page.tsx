import { CareerCta } from '@/components/CareerCta'

export const metadata = { title: 'تطابق شغلی — ایرنو Career Studio' }

export default function JobMatchProductPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-3xl mb-6">🎯</div>
        <h1 className="text-4xl font-extrabold text-[var(--color-text-primary)] mb-4">تطابق شغلی</h1>
        <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed">
          رزومه خود را با آگهی‌های استخدامی مقایسه کنید.
          کلیدواژه‌های جاافتاده، شکاف مهارتی و پیشنهاد بهبود رزومه برای هر موقعیت.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-400">
          ⚠️ نسخه پایه — جاب مچ هوشمند در نسخه‌های بعدی
        </div>
        <div className="mt-8">
          <CareerCta
            label="امتحان کنید ←"
            studioPath="/studio/job-match"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-8 py-3.5 text-base font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-16">
        {[
          { icon: '📋', title: 'جای‌گذاری آگهی', desc: 'متن آگهی استخدامی را paste کنید. سیستم آن را تحلیل می‌کند.' },
          { icon: '🔑', title: 'شکاف کلیدواژه', desc: 'کلیدواژه‌هایی که در آگهی هستند اما در رزومه شما نیستند را نشان می‌دهد.' },
          { icon: '📊', title: 'امتیاز تطابق', desc: 'درصد تطابق رزومه با الزامات آگهی شغلی.' },
          { icon: '💡', title: 'پیشنهاد بهبود', desc: 'توصیه‌های مشخص برای بهتر کردن رزومه جهت این موقعیت.' },
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

      <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6">
        <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-2">درباره دقت نتایج</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
          تطابق شغلی در نسخه فعلی بر اساس مطابقت کلیدواژه‌ای است و هوش مصنوعی ندارد.
          نتایج راهنما هستند نه قطعی. امتیاز roleMatch فقط زمانی محاسبه می‌شود که آگهی ارائه شده باشد.
        </p>
      </div>
    </div>
  )
}
