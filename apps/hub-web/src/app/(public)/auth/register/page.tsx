import type { Metadata } from 'next'
import Link from 'next/link'
import { IrnoIdShell } from '@/components/auth/IrnoIdShell'
import { IrnoIdRegisterForm } from '@/components/auth/IrnoIdRegisterForm'

export const metadata: Metadata = {
  title: 'ساخت حساب ایرنو',
  description: 'یک حساب ایرنو بسازید و به اپلیکیشن‌های ایرنو دسترسی داشته باشید.',
}

interface PageProps {
  searchParams: Promise<{
    from?: string
    app?: string
    returnTo?: string
    mobile?: string
    fromOtp?: string
  }>
}

/**
 * /auth/register — Irno ID public registration page.
 *
 * Creates an Irno ID account (User + Profile + Applicant CRM record).
 * Does NOT create Student, Enrollment, or Payment.
 * Applicant → Student flow remains an internal Hub business process.
 */
export default async function IrnoIdRegisterPage({ searchParams }: PageProps) {
  const params = await searchParams
  const appContext = params.app ?? null

  // Build login link preserving all relevant params
  const loginParams = new URLSearchParams()
  if (appContext) loginParams.set('app', appContext)
  if (params.from) loginParams.set('from', params.from)
  if (params.returnTo) loginParams.set('returnTo', params.returnTo)
  const loginHref = `/auth/login${loginParams.size > 0 ? `?${loginParams.toString()}` : ''}`

  return (
    <IrnoIdShell
      title="ساخت حساب ایرنو"
      subtitle="یک حساب بسازید و به دنیای آکادمی ایرنو وارد شوید."
      appContext={appContext}
      footer={
        <>
          قبلاً حساب دارید؟{' '}
          <Link
            href={loginHref}
            className="font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] hover:underline"
          >
            ورود
          </Link>
        </>
      }
    >
      <IrnoIdRegisterForm />
    </IrnoIdShell>
  )
}
