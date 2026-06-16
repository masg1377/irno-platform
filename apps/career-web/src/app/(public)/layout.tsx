import { PublicShellServer } from '@/components/PublicShellServer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShellServer>{children}</PublicShellServer>
}
