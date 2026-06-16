'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fa } from '@irno/i18n'

const ALLOWED_RETURN_TO_ORIGINS: string[] = [
  process.env['NEXT_PUBLIC_CAREER_WEB_URL'] ?? 'http://localhost:3002',
].filter(Boolean)

function getValidReturnTo(raw: string | null): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return ALLOWED_RETURN_TO_ORIGINS.some((o) => { try { return url.origin === new URL(o).origin } catch { return false } }) ? raw : null
  } catch { return null }
}

/**
 * Login form — calls POST /api/v1/auth/login (via Next.js rewrite proxy).
 * On success the API sets httpOnly cookies irno_at and irno_rt.
 * Redirects to ?from param if present (e.g. SSO handoff), otherwise /dashboard.
 */
function LoginFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  /** After login, return to ?from=<path> if set (e.g. /sso/meetino?...) */
  const from = searchParams.get('from')
  const returnTo = searchParams.get('returnTo')
  const app = searchParams.get('app')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ensures cookies are stored
        body: JSON.stringify({ mobile, password }),
      })

      type LoginResponseBody = { message?: string; error?: string; statusCode?: number; role?: string }
      const raw = (await res.json()) as { data?: LoginResponseBody } & LoginResponseBody
      const json = raw.data ?? raw

      if (!res.ok) {
        // Map common status codes to user-friendly Persian messages
        if (res.status === 401) {
          setError(fa.auth.invalidCredentials)
        } else if (res.status === 403) {
          setError(json.message ?? fa.auth.accountSuspended)
        } else {
          setError(json.message ?? fa.errors.generic)
        }
        return
      }

      // Cookies are now set. Apply redirect priority:
      //   1. valid returnTo (absolute, allowlisted) → cross-app
      //   2. hub-internal `from` path (SSO, protected route)
      //   3. app context default
      //   4. role-based Hub default
      const validReturnTo = getValidReturnTo(returnTo)
      if (validReturnTo) {
        window.location.href = validReturnTo
        return
      }

      if (from && from.startsWith('/') && !from.startsWith('//')) {
        router.push(from)
        router.refresh()
        return
      }

      if (app === 'career') {
        const careerUrl = process.env['NEXT_PUBLIC_CAREER_WEB_URL'] ?? 'http://localhost:3002'
        window.location.href = `${careerUrl}/studio`
        return
      }
      if (app === 'meetino') {
        const meetinoCallback = process.env['NEXT_PUBLIC_MEETINO_CALLBACK_URL'] ?? 'http://localhost:3001/auth/irno/callback'
        window.location.href = `/sso/meetino?redirect_uri=${encodeURIComponent(meetinoCallback)}`
        return
      }

      // Role-based redirect: staff → /dashboard, portal users → /portal
      const staffRoles = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'TEACHER', 'MENTOR']
      const destination = json.role && staffRoles.includes(json.role) ? '/dashboard' : '/portal'
      router.push(destination)
      router.refresh()
    } catch {
      setError(fa.errors.networkError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Mobile field */}
      <div>
        <label
          htmlFor="mobile"
          className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
        >
          {fa.auth.mobile}
        </label>
        <input
          id="mobile"
          type="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="09xxxxxxxxx"
          dir="ltr"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-left text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          required
          disabled={loading}
          autoComplete="tel"
        />
      </div>

      {/* Password field */}
      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
        >
          {fa.auth.password}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          dir="ltr"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-left text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          required
          disabled={loading}
          autoComplete="current-password"
        />
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]"
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !mobile || !password}
        className="w-full rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'در حال ورود...' : fa.auth.loginButton}
      </button>
    </form>
  )
}

/**
 * Exported wrapper — useSearchParams requires a Suspense boundary in Next.js 16.
 */
export function LoginForm() {
  return (
    <Suspense fallback={<div className="h-40" />}>
      <LoginFormInner />
    </Suspense>
  )
}
