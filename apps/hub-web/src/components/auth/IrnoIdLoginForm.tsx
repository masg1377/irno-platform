'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fa } from '@irno/i18n'

/**
 * Allowed origins for cross-app returnTo redirect after login.
 * Uses NEXT_PUBLIC_CAREER_WEB_URL env var (set in hub-web .env.local).
 * Only these origins are trusted — open redirect prevention.
 */
const ALLOWED_RETURN_TO_ORIGINS: string[] = [
  process.env['NEXT_PUBLIC_CAREER_WEB_URL'] ?? 'http://localhost:3002',
  // Future: 'https://cv.irno.academy'
].filter(Boolean)

function getValidReturnTo(raw: string | null): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const allowed = ALLOWED_RETURN_TO_ORIGINS.some((origin) => {
      try { return url.origin === new URL(origin).origin } catch { return false }
    })
    return allowed ? raw : null
  } catch {
    return null
  }
}

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 disabled:cursor-not-allowed disabled:opacity-60'

const btnPrimary =
  'w-full rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/40 disabled:cursor-not-allowed disabled:opacity-50'

type LoginTab = 'otp' | 'password'
type OtpStep = 'mobile' | 'code'

// ─── OTP Login Panel ──────────────────────────────────────────────────────────

function OtpLoginPanel({
  onSuccess,
  onNeedsProfile,
}: {
  onSuccess: (role?: string) => void
  /** Called when OTP verify returns needsProfile=true — mobile passed so caller can redirect with full context */
  onNeedsProfile: (mobile: string) => void
}) {
  const [step, setStep] = useState<OtpStep>('mobile')
  const [mobile, setMobile] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mobile }),
      })
      const raw = (await res.json()) as { data?: { message?: string; cooldownSeconds?: number; devCode?: string }; message?: string; cooldownSeconds?: number; devCode?: string }
      const json = raw.data ?? raw
      if (!res.ok) {
        if (res.status === 429 && json.cooldownSeconds) {
          setCooldown(json.cooldownSeconds)
          setError(fa.irnoId.otp.cooldownError(json.cooldownSeconds))
        } else {
          setError(json.message ?? fa.errors.generic)
        }
        return
      }
      setSentTo(mobile)
      setCooldown(json.cooldownSeconds ?? 60)
      if (json.devCode) { setDevCode(json.devCode); setCode(json.devCode) }
      setStep('code')
    } catch {
      setError(fa.errors.networkError)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mobile, code }),
      })
      type OtpVerifyBody = { needsProfile?: boolean; message?: string; role?: string; code?: string }
      const raw = (await res.json()) as { data?: OtpVerifyBody } & OtpVerifyBody
      const json = raw.data ?? raw
      if (!res.ok) {
        const errCode = json.code ?? ''
        if (errCode === 'EXPIRED_CODE') setError(fa.irnoId.otp.expiredCode)
        else if (errCode === 'TOO_MANY_ATTEMPTS') setError(fa.irnoId.otp.tooManyAttempts)
        else if (errCode === 'INVALID_CODE') setError(fa.irnoId.otp.invalidCode)
        else setError(json.message ?? fa.errors.generic)
        return
      }
      // New user needs to complete their profile — delegate to parent with full context
      if (json.needsProfile) {
        onNeedsProfile(mobile)
        return
      }
      onSuccess(json.role)
    } catch {
      setError(fa.errors.networkError)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (cooldown > 0) return
    setError(null)
    setCode('')
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mobile }),
      })
      const raw = (await res.json()) as { data?: { cooldownSeconds?: number; message?: string; devCode?: string }; cooldownSeconds?: number; message?: string; devCode?: string }
      const json = raw.data ?? raw
      if (res.ok) {
        setCooldown(json.cooldownSeconds ?? 60)
        if (json.devCode) { setDevCode(json.devCode); setCode(json.devCode) }
      } else {
        if (res.status === 429 && json.cooldownSeconds) {
          setCooldown(json.cooldownSeconds)
          setError(fa.irnoId.otp.cooldownError(json.cooldownSeconds))
        } else {
          setError(json.message ?? fa.errors.generic)
        }
      }
    } catch {
      setError(fa.errors.networkError)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'mobile') {
    return (
      <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
        <div>
          <label htmlFor="otp-mobile" className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
            {fa.irnoId.mobile}
          </label>
          <input
            id="otp-mobile"
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="09xxxxxxxxx"
            dir="ltr"
            className={inputCls}
            required
            disabled={loading}
            autoComplete="tel"
            autoFocus
          />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading || !mobile} className={btnPrimary}>
          {loading ? 'در حال ارسال...' : fa.irnoId.otp.sendCode}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
      {sentTo && (
        <p className="rounded-lg bg-[var(--color-brand-500)]/10 px-4 py-3 text-sm text-[var(--color-brand-700)]">
          {fa.irnoId.otp.codeSent(sentTo)}
        </p>
      )}
      {devCode && (
        <p className="rounded-lg border border-yellow-400 bg-yellow-50 px-4 py-2.5 text-center text-sm text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300">
          🔧 حالت توسعه — کد OTP: <span className="font-mono font-bold tracking-widest">{devCode}</span>
        </p>
      )}
      <div>
        <label htmlFor="otp-code" className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
          {fa.irnoId.otp.enterCode}
        </label>
        <input
          id="otp-code"
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder={fa.irnoId.otp.enterCodePlaceholder}
          dir="ltr"
          maxLength={6}
          className={`${inputCls} text-center text-lg tracking-widest`}
          required
          disabled={loading}
          autoFocus
          autoComplete="one-time-code"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
      <button type="submit" disabled={loading || code.length < 6} className={btnPrimary}>
        {loading ? 'در حال بررسی...' : fa.irnoId.otp.verify}
      </button>
      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <button
          type="button"
          onClick={() => { setStep('mobile'); setCode(''); setError(null) }}
          className="hover:text-[var(--color-text-secondary)] hover:underline"
        >
          ویرایش شماره
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || loading}
          className="hover:text-[var(--color-brand-600)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cooldown > 0 ? fa.irnoId.otp.resendIn(cooldown) : fa.irnoId.otp.resend}
        </button>
      </div>
    </form>
  )
}

// ─── Password Login Panel ─────────────────────────────────────────────────────

function PasswordLoginPanel({ onSuccess }: { onSuccess: (role?: string) => void }) {
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
        credentials: 'include',
        body: JSON.stringify({ mobile, password }),
      })
      type LoginBody = { message?: string; code?: string; role?: string }
      const raw = (await res.json()) as { data?: LoginBody } & LoginBody
      const json = raw.data ?? raw
      if (!res.ok) {
        if (json.code === 'NO_PASSWORD') setError(fa.irnoId.noPasswordUseOtp)
        else if (res.status === 401) setError(fa.irnoId.invalidCredentials)
        else if (res.status === 403) setError(json.message ?? fa.irnoId.accountSuspended)
        else setError(json.message ?? fa.errors.generic)
        return
      }
      onSuccess(json.role)
    } catch {
      setError(fa.errors.networkError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="pw-mobile" className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
          {fa.irnoId.mobile}
        </label>
        <input
          id="pw-mobile"
          type="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="09xxxxxxxxx"
          dir="ltr"
          className={inputCls}
          required
          disabled={loading}
          autoComplete="tel"
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="pw-password" className="text-sm font-medium text-[var(--color-text-secondary)]">
            {fa.irnoId.password}
          </label>
          <a href="/auth/forgot-password" className="text-xs text-[var(--color-brand-600)] hover:underline">
            {fa.irnoId.forgotPasswordLink}
          </a>
        </div>
        <input
          id="pw-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          dir="ltr"
          className={inputCls}
          required
          disabled={loading}
          autoComplete="current-password"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !mobile || !password}
        className={btnPrimary}
      >
        {loading ? 'در حال ورود...' : fa.irnoId.loginButton}
      </button>
    </form>
  )
}

// ─── Main exported component ──────────────────────────────────────────────────

function IrnoIdLoginFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const returnTo = searchParams.get('returnTo')
  const app = searchParams.get('app')
  const [activeTab, setActiveTab] = useState<LoginTab>('otp')

  /**
   * Post-login redirect priority:
   *   1. valid returnTo (absolute URL, allowlisted) → cross-app redirect
   *   2. hub-internal `from` path (e.g. /sso/meetino?redirect_uri=...)
   *   3. app context default (app=career → career-web/studio)
   *   4. role-based Hub default (staff → /dashboard, others → /portal)
   */
  function handleSuccess(role?: string) {
    // Priority 1: absolute returnTo (cross-app, allowlisted)
    const validReturnTo = getValidReturnTo(returnTo)
    if (validReturnTo) {
      window.location.href = validReturnTo
      return
    }

    // Priority 2: hub-internal relative path (SSO, protected route redirect)
    if (from && from.startsWith('/') && !from.startsWith('//')) {
      router.push(from)
      router.refresh()
      return
    }

    // Priority 3: app context default (no explicit returnTo or from)
    if (app === 'career') {
      const careerUrl = process.env['NEXT_PUBLIC_CAREER_WEB_URL'] ?? 'http://localhost:3002'
      window.location.href = `${careerUrl}/studio`
      return
    }
    if (app === 'meetino') {
      // Redirect through Meetino SSO flow to get a Meetino session
      const meetinoCallback = process.env['NEXT_PUBLIC_MEETINO_CALLBACK_URL'] ?? 'http://localhost:3001/auth/irno/callback'
      window.location.href = `/sso/meetino?redirect_uri=${encodeURIComponent(meetinoCallback)}`
      return
    }

    // Priority 4: role-based Hub default
    const staffRoles = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'TEACHER', 'MENTOR']
    const destination = role && staffRoles.includes(role) ? '/dashboard' : '/portal'
    router.push(destination)
    router.refresh()
  }

  /**
   * Called when OTP verify returns needsProfile=true (new user, no account yet).
   * Redirects to /auth/register with full context preserved (returnTo, app, from).
   */
  function handleNeedsProfile(mobile: string) {
    const params = new URLSearchParams({ mobile, fromOtp: '1' })
    if (returnTo) params.set('returnTo', returnTo)
    if (app) params.set('app', app)
    if (from) params.set('from', from)
    window.location.href = `/auth/register?${params.toString()}`
  }

  const tabCls = (active: boolean) =>
    `flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
      active
        ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
    }`

  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div
        className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-1 gap-1"
        role="tablist"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'otp'}
          onClick={() => setActiveTab('otp')}
          className={tabCls(activeTab === 'otp')}
        >
          {fa.irnoId.otp.tabOtp}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'password'}
          onClick={() => setActiveTab('password')}
          className={tabCls(activeTab === 'password')}
        >
          {fa.irnoId.otp.tabPassword}
        </button>
      </div>

      {activeTab === 'otp'
        ? <OtpLoginPanel onSuccess={handleSuccess} onNeedsProfile={handleNeedsProfile} />
        : <PasswordLoginPanel onSuccess={handleSuccess} />
      }
    </div>
  )
}

export function IrnoIdLoginForm() {
  return (
    <Suspense fallback={<div className="h-52" />}>
      <IrnoIdLoginFormInner />
    </Suspense>
  )
}
