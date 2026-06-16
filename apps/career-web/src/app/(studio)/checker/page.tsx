import Link from 'next/link'
import { CareerCta } from '@/components/CareerCta'

export const metadata = { title: 'بررسی رزومه — ایرنو Career Studio' }

export default function CheckerProductPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-3xl mb-6">✅</div>
        <h1 className="text-4xl font-extrabold text-[var(--color-text-primary)] mb-4">بررسی رزومه</h1>
        <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed">
          رزومه خود را از نظر ATS، ساختار، کلیدواژه، دستاوردها و خوانایی بررسی کنید.
          امتیاز دقیق و پیشنهادهای عملی قابل اجرا دریافت کنید.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-400">
          ⚠️ دقت parser در حال بهبود است — نسخه بتا
        </div>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <CareerCta
            label="شروع بررسی رایگان ←"
            studioPath="/studio/checker"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-8 py-3.5 text-base font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors"
          />
          <Link href="/studio/checker" className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--color-border)] px-8 py-3.5 text-base font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors">
            ورود و بررسی
          </Link>
        </div>
      </div>

      {/* Score dimensions */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-8 text-center">۸ بُعد بررسی</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'امتیاز ATS', icon: '🤖', desc: 'سازگاری با سیستم‌های ATS' },
            { label: 'نگاه سریع HR', icon: '👁️', desc: 'تأثیر ۶ ثانیه‌ای رزومه' },
            { label: 'ساختار', icon: '🏗️', desc: 'ترتیب و تعداد بخش‌ها' },
            { label: 'دستاوردها', icon: '🏆', desc: 'کیفیت bullet‌ها' },
            { label: 'کلیدواژه', icon: '🔑', desc: 'تطابق با آگهی شغلی' },
            { label: 'قالب‌بندی', icon: '🎨', desc: 'ریسک‌های خوانایی' },
            { label: 'کامل‌بودن', icon: '✔️', desc: 'بخش‌های ضروری' },
            { label: 'خوانایی', icon: '📖', desc: 'وضوح و سادگی متن' },
          ].map((dim) => (
            <div key={dim.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 text-center">
              <div className="text-2xl mb-2">{dim.icon}</div>
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">{dim.label}</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{dim.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Input modes */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-8 text-center">حالت‌های بررسی</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { icon: '📄', title: 'رزومه ایرنو', desc: 'رزومه‌ای که در ایرنو CV ساخته‌اید مستقیماً بررسی می‌شود.' },
            { icon: '📋', title: 'چسباندن متن', desc: 'متن رزومه را کپی‌پیست کنید. از هر فرمتی قابل انجام است.' },
            { icon: '📎', title: 'آپلود PDF', desc: 'فایل PDF متن‌دار (نه اسکن‌شده) را آپلود کنید.' },
            { icon: '🎯', title: 'بررسی با آگهی شغلی', desc: 'رزومه را با یک آگهی استخدامی مقایسه کنید. امتیاز تطابق ببینید.' },
          ].map((mode) => (
            <div key={mode.title} className="flex gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
              <div className="text-2xl shrink-0">{mode.icon}</div>
              <div>
                <div className="font-semibold text-sm text-[var(--color-text-primary)] mb-1">{mode.title}</div>
                <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{mode.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Limitation note */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6">
        <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-2">محدودیت‌های شناخته‌شده (نسخه بتا)</h3>
        <ul className="space-y-1.5 text-sm text-amber-700 dark:text-amber-400">
          <li>• PDF اسکن‌شده (تصویری) قابل بررسی نیست — فقط PDF متن‌دار</li>
          <li>• تشخیص بخش‌ها بر اساس عناوین استاندارد است — فارسی غیراستاندارد ممکن است تشخیص داده نشود</li>
          <li>• امتیاز keyword و دستاوردها در نسخه‌های بعدی با هوش مصنوعی بهبود می‌یابد</li>
          <li>• نتایج راهنمایی هستند و جایگزین قضاوت متخصص نمی‌شوند</li>
        </ul>
      </div>
    </div>
  )
}
