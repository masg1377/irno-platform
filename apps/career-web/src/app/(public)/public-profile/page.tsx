import { CareerCta } from '@/components/CareerCta'

export const metadata = { title: 'پروفایل عمومی زنده — ایرنو Career Studio' }

export default function PublicProfilePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-3xl mb-6">🌐</div>
        <h1 className="text-4xl font-extrabold text-[var(--color-text-primary)] mb-4">پروفایل عمومی زنده</h1>
        <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed">
          یک لینک عمومی از رزومه‌تان که همیشه به‌روز است.
          بدون نیاز به ارسال فایل جدید هر بار.
        </p>
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] inline-flex items-center gap-2 px-5 py-2.5 text-sm text-[var(--color-text-muted)] font-mono">
          irno.cv/u/<span className="text-[var(--color-brand-600)]">نام-شما</span>
        </div>
        <div className="mt-8">
          <CareerCta
            label="ساخت پروفایل عمومی ←"
            studioPath="/settings"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-8 py-3.5 text-base font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-16">
        {[
          { icon: '🔗', title: 'لینک دائمی', desc: 'یک URL ثابت که همیشه جدیدترین نسخه رزومه‌تان را نشان می‌دهد.' },
          { icon: '🔄', title: 'همیشه به‌روز', desc: 'هر بار که رزومه را ویرایش کنید، لینک عمومی هم آپدیت می‌شود بدون هیچ کار اضافه‌ای.' },
          { icon: '📱', title: 'PDF دانلود', desc: 'بازدیدکنندگان می‌توانند PDF رزومه شما را دانلود کنند.' },
          { icon: '🔒', title: 'کنترل حریم خصوصی', desc: 'انتخاب کنید چه اطلاعاتی عمومی باشد. شماره و ایمیل قابل مخفی‌سازی هستند.' },
          { icon: '🗂️', title: 'پورتفولیو یکپارچه', desc: 'پروفایل عمومی شامل پروژه‌ها و پورتفولیو هم هست — یک لینک برای همه.' },
          { icon: '📜', title: 'نمایش مدارک', desc: 'مدارک ایرنو با لینک تأیید در پروفایل عمومی قابل نمایش هستند.' },
          { icon: '🌐', title: 'دامنه اختصاصی', desc: 'دامنه سفارشی — به‌زودی در نسخه پریمیوم.' },
          { icon: '👁️', title: 'آمار بازدید', desc: 'ببینید چند نفر پروفایل شما را دیده‌اند — در نسخه‌های بعدی.' },
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
