import type { Metadata } from 'next'
import Link from 'next/link'
import { IrnoIdShell } from '@/components/auth/IrnoIdShell'

export const metadata: Metadata = {
  title: 'بازیابی رمز عبور',
}

/**
 * /auth/forgot-password — Placeholder for password recovery.
 * Full implementation requires SMS/email integration (Phase 10+).
 */
export default function ForgotPasswordPage() {
  return (
    <IrnoIdShell
      title="بازیابی رمز عبور"
      subtitle="این قابلیت به زودی فعال می‌شود."
      footer={
        <Link
          href="/auth/login"
          className="font-medium text-[var(--color-brand-600)] hover:underline"
        >
          بازگشت به ورود
        </Link>
      }
    >
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-6 text-center">
        <div className="mb-3 text-3xl">🔐</div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          برای بازیابی رمز عبور، با پشتیبانی ایرنو تماس بگیرید.
        </p>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          قابلیت بازیابی خودکار در نسخه‌های آینده اضافه می‌شود.
        </p>
      </div>
    </IrnoIdShell>
  )
}
