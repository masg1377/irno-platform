import { redirect } from 'next/navigation'
import { getMe } from '@/lib/api'
import { UserRole } from '@irno/types'

/**
 * Root route — fetches current user and redirects based on role.
 *
 * Staff (SUPER_ADMIN, ADMIN, ACCOUNTANT, TEACHER, MENTOR) → /dashboard
 * Applicants, students, guests → /portal
 * Unauthenticated → /auth/login (proxy handles this)
 */
export default async function RootPage() {
  const user = await getMe()

  if (!user) {
    redirect('/auth/login')
  }

  const staffRoles: UserRole[] = [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.TEACHER,
    UserRole.MENTOR,
  ]

  if (staffRoles.includes(user.role)) {
    redirect('/dashboard')
  }

  redirect('/portal')
}
