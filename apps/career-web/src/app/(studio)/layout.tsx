import { cookies, headers } from 'next/headers'
import { getCareerProfile } from '@/lib/api'
import { CareerShell } from '@/components/CareerShell'
import { PublicShellServer } from '@/components/PublicShellServer'

/**
 * Studio layout — route-aware + auth-aware.
 *
 * Public marketing routes (always PublicShell, even when logged in):
 *   /, /checker, /templates, /portfolio, /roadmap, /job-match, /pricing, /cv, /public-profile, /public/*, /u/*
 *
 * App routes (CareerShell with sidebar, requires auth):
 *   /resumes, /settings, /profile, /studio/*, /builder, /portfolio (management)
 *
 * proxy.ts injects x-pathname header so we can detect the current route server-side.
 */

const PUBLIC_MARKETING_EXACT = new Set([
  '/',
  '/checker',
  '/templates',
  '/roadmap',
  '/job-match',
  '/pricing',
  '/cv',
  '/public-profile',
])

function isPublicMarketingRoute(pathname: string): boolean {
  if (PUBLIC_MARKETING_EXACT.has(pathname)) return true
  if (pathname.startsWith('/roadmap/')) return true
  if (pathname.startsWith('/public/')) return true
  if (pathname.startsWith('/u/')) return true
  return false
}

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const headersList = await headers()
  const token = cookieStore.get('irno_at')?.value

  // Pathname injected by proxy.ts via x-pathname header
  const pathname = headersList.get('x-pathname') ?? '/'

  // No auth, OR this is a public marketing/product page → PublicShell
  if (!token || isPublicMarketingRoute(pathname)) {
    return <PublicShellServer>{children}</PublicShellServer>
  }

  // Authenticated + app route → CareerShell with sidebar
  const profile = await getCareerProfile()
  return <CareerShell profile={profile}>{children}</CareerShell>
}
