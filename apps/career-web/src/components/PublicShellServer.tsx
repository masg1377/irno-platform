/**
 * PublicShellServer — server component wrapper for PublicShell.
 *
 * Reads the irno_at cookie (httpOnly — inaccessible from client JS) and
 * passes isLoggedIn as a prop to the client PublicShell component.
 *
 * This is the correct pattern for giving auth context to a 'use client' shell:
 *   server component reads cookie → passes boolean prop → client component renders conditionally.
 *
 * Usage (in layouts):
 *   import { PublicShellServer } from '@/components/PublicShellServer'
 *   export default function Layout({ children }) {
 *     return <PublicShellServer>{children}</PublicShellServer>
 *   }
 */
import { cookies } from 'next/headers'
import { PublicShell } from './PublicShell'

export async function PublicShellServer({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isLoggedIn = cookieStore.has('irno_at')
  return <PublicShell isLoggedIn={isLoggedIn}>{children}</PublicShell>
}
