import type { Metadata } from 'next'
import Link from 'next/link'
import { IrnoIdShell } from '@/components/auth/IrnoIdShell'
import { IrnoIdLoginForm } from '@/components/auth/IrnoIdLoginForm'

export const metadata: Metadata = {
  title: 'ورود به ایرنو',
  description: 'با حساب ایرنو وارد شوید.',
}

interface PageProps {
  searchParams: Promise<{
    from?: string
    app?: string
    returnTo?: string
    redirect_uri?: string
  }>
}

/**
 * /auth/login — Irno ID Hosted Login page.
 *
 * Generic Irno identity UI — not Hub/admin-specific.
 * Supports ?app=meetino to show app-aware context title.
 * Supports ?from= and ?redirect_uri= for post-login redirect.
 */
export default async function IrnoIdLoginPage({ searchParams }: PageProps) {
  const params = await searchParams
  const appContext = params.app ?? null

  // Build register link preserving all relevant params
  const registerParams = new URLSearchParams()
  if (appContext) registerParams.set('app', appContext)
  if (params.from) registerParams.set('from', params.from)
  if (params.returnTo) registerParams.set('returnTo', params.returnTo)
  const registerHref = `/auth/register${registerParams.size > 0 ? `?${registerParams.toString()}` : ''}`

  return (
    <IrnoIdShell
      title="ورود امن به ایرنو"
      appContext={appContext}
      footer={
        <>
          حساب ندارید؟{' '}
          <Link
            href={registerHref}
            className="font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] hover:underline"
          >
            ساخت حساب ایرنو
          </Link>
        </>
      }
    >
      <IrnoIdLoginForm />
    </IrnoIdShell>
  )
}
