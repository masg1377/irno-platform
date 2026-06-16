// Pass-through — shell selection is handled by the parent (studio)/layout.tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
