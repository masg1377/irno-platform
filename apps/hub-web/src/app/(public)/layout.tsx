/**
 * Public layout — minimal, centered, no sidebar.
 * Used for: login, forgot-password (Phase 2+).
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      {children}
    </div>
  )
}
