import type { Metadata } from 'next'
import Link from 'next/link'
import { getMe } from '@/lib/api'
import { cookies } from 'next/headers'
import type { UserWithProfileDto } from '@irno/types'
import { fa } from '@irno/i18n'

export const metadata: Metadata = {
  title: 'کاربران',
}

async function getUsers(search?: string): Promise<UserWithProfileDto[]> {
  const cookieStore = await cookies()
  const token = cookieStore.get('irno_at')?.value
  if (!token) return []

  const apiBase = (process.env['HUB_API_URL'] ?? 'http://localhost:4000') + '/api/v1'
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('limit', '50')

  try {
    const res = await fetch(`${apiBase}/users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = (await res.json()) as { data: { data: UserWithProfileDto[] } }
    return json.data.data ?? []
  } catch {
    return []
  }
}

interface PageProps {
  searchParams: Promise<{ search?: string }>
}

export default async function UsersPage({ searchParams }: PageProps) {
  const { search } = await searchParams
  const [currentUser, users] = await Promise.all([getMe(), getUsers(search)])

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {fa.users.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{fa.users.subtitle}</p>
        </div>
        <Link
          href="/users/new"
          className="shrink-0 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)]"
        >
          + {fa.users.addUser}
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="mb-6">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder={fa.users.searchPlaceholder}
          className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
        />
      </form>

      {/* Table */}
      {users.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.users.noUsers}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-right">
                <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">نام</th>
                <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">موبایل</th>
                <th className="hidden px-4 py-3 font-medium text-[var(--color-text-muted)] md:table-cell">
                  ایمیل
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">نقش</th>
                <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-subtle)]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-xs font-semibold text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)]/40 dark:text-[var(--color-brand-300)]">
                        {user.profile?.firstName?.[0] ?? '؟'}
                      </div>
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {user.profile
                          ? `${user.profile.firstName} ${user.profile.lastName}`
                          : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)]" dir="ltr">
                    {user.mobile}
                  </td>
                  <td className="hidden px-4 py-3 text-[var(--color-text-muted)] md:table-cell">
                    {user.email ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={user.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Current user info (for context) */}
      {currentUser && (
        <p className="mt-4 text-xs text-[var(--color-text-muted)]">
          نمایش {users.length} کاربر · شما با نقش {fa.roles[currentUser.role]} وارد شده‌اید
        </p>
      )}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    ACCOUNTANT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    TEACHER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    MENTOR: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    STUDENT: 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
    GUEST: 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]',
    LEAD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  }
  const label = fa.roles[role as keyof typeof fa.roles] ?? role
  const cls = colors[role] ?? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]'

  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    INACTIVE: 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]',
    SUSPENDED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  }
  const label = fa.status[status as keyof typeof fa.status] ?? status
  const cls = colors[status] ?? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]'

  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
  )
}
