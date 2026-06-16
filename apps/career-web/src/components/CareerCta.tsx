/**
 * CareerCta — auth-aware call-to-action link (server component).
 *
 * Logged-in users → studioPath directly (career-web relative path)
 * Unauthenticated → Irno ID register page with app=career + returnTo (absolute URL)
 *
 * Uses `returnTo` (absolute URL) so Hub auth forms know to redirect back to
 * career-web after login, regardless of user role (ADMIN, STUDENT, etc.).
 *
 * Usage:
 *   <CareerCta label="شروع رایگان ←" studioPath="/studio" className="btn-primary" />
 *   <CareerCta label="بررسی رزومه" studioPath="/studio/checker" className="..." />
 */
import { cookies } from 'next/headers'

const HUB_WEB_URL = process.env['NEXT_PUBLIC_HUB_WEB_URL'] ?? 'http://localhost:3000'
const CAREER_WEB_URL = process.env['NEXT_PUBLIC_CAREER_WEB_URL'] ?? 'http://localhost:3002'

interface Props {
  label: string
  /** Career-web path for logged-in users, e.g. '/studio' or '/studio/checker' */
  studioPath: string
  /** Override the returnTo target (absolute URL). Defaults to CAREER_WEB_URL + studioPath. */
  returnToOverride?: string
  className?: string
}

export async function CareerCta({ label, studioPath, returnToOverride, className }: Props) {
  const cookieStore = await cookies()
  const isLoggedIn = cookieStore.has('irno_at')

  // Build absolute returnTo so Hub auth can redirect back to career-web
  // regardless of the logged-in user's role.
  const absReturnTo = returnToOverride ?? `${CAREER_WEB_URL}${studioPath}`

  const href = isLoggedIn
    ? studioPath
    : `${HUB_WEB_URL}/auth/register?app=career&returnTo=${encodeURIComponent(absReturnTo)}`

  return (
    <a href={href} className={className}>
      {label}
    </a>
  )
}
