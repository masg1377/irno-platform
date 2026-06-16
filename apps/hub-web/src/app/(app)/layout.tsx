import { redirect } from 'next/navigation'
import { getMe } from '@/lib/api'
import { AppShell } from '@/components/layout/AppShell'

/**
 * App layout — server component that guards all admin/staff pages.
 *
 * On every render it calls GET /api/v1/auth/me.
 * - If the response is null (no token, expired token) → redirect to /login.
 * - If the user has a portal-only role (APPLICANT, STUDENT, GUEST, LEAD)
 *   → redirect to /portal. Admin UI is for staff only.
 *
 * The user object is passed down to AppShell so the Sidebar and Topbar
 * can show real user info without an extra client-side fetch.
 */

/** Roles that belong in the portal, not the admin hub. */
const PORTAL_ROLES = ['APPLICANT', 'STUDENT', 'GUEST', 'LEAD']

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getMe()

  if (!user) {
    redirect('/login')
  }

  // Portal-role users who navigate directly to an admin route are redirected
  // back to /portal. Backend APIs already return 403 for these roles, but
  // we also prevent them from seeing the admin UI shell.
  if (PORTAL_ROLES.includes(user.role)) {
    redirect('/portal')
  }

  return <AppShell user={user}>{children}</AppShell>
}
