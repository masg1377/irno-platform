'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import type { UserWithProfileDto } from '@irno/types'

interface AppShellProps {
  children: React.ReactNode
  user: UserWithProfileDto
}

/**
 * AppShell — the main authenticated layout.
 *
 * Structure (RTL):
 * ┌────────────────────────────────────────────┐
 * │  Topbar (full width, 60px)                 │
 * ├──────────────────┬─────────────────────────┤
 * │  Main content    │  Sidebar (260px, right)  │
 * └──────────────────┴─────────────────────────┘
 *
 * Sidebar is on the RIGHT in RTL layout.
 * It collapses to a drawer on mobile.
 *
 * `user` is fetched server-side in the layout and passed down here
 * to avoid client-side refetches for user identity.
 */
export function AppShell({ children, user }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      {/* Top bar */}
      <Topbar onMenuClick={() => setSidebarOpen((v) => !v)} user={user} />

      {/* Body: content + sidebar */}
      <div className="flex flex-1 overflow-hidden" style={{ marginTop: 'var(--topbar-height)' }}>
        {/* Sidebar — right side in RTL (must be first child so it renders on the right in RTL flex) */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />

        {/* Main content — grows to fill space */}
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
