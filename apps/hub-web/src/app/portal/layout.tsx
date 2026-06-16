import { redirect } from 'next/navigation'
import { getPortalMe } from '@/lib/api'
import { PortalShell } from '@/components/portal/PortalShell'

/**
 * Portal layout — guards all /portal/* routes.
 *
 * - Fetches GET /api/v1/portal/me for identity + section availability.
 * - Unauthenticated users → redirect to /auth/login.
 * - Uses PortalShell (simpler than admin AppShell).
 *
 * Note: Staff users (admin, teacher, etc.) CAN access the portal if they
 * navigate to /portal directly — they see a minimal profile view.
 * The portal doesn't block staff; it just doesn't show admin data.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const portalMe = await getPortalMe()

  if (!portalMe) {
    redirect('/auth/login?from=/portal')
  }

  return <PortalShell portalMe={portalMe}>{children}</PortalShell>
}
