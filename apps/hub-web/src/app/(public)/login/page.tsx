import { redirect } from 'next/navigation'

/**
 * /login — legacy route, redirects to Irno ID Hosted Login.
 * Preserves ?from= query param for SSO continuity.
 */
interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LegacyLoginPage({ searchParams }: PageProps) {
  const params = await searchParams
  const from = typeof params.from === 'string' ? params.from : undefined
  const app = typeof params.app === 'string' ? params.app : undefined

  const qs = new URLSearchParams()
  if (from) qs.set('from', from)
  if (app) qs.set('app', app)
  const query = qs.toString()

  redirect(`/auth/login${query ? `?${query}` : ''}`)
}

