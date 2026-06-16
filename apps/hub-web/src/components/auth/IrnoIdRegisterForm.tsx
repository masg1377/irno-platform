'use client'

/**
 * Allowed origins for cross-app returnTo redirect after register.
 * Only these origins are trusted — open redirect prevention.
 */
const ALLOWED_RETURN_TO_ORIGINS: string[] = [
  process.env['NEXT_PUBLIC_CAREER_WEB_URL'] ?? 'http://localhost:3002',
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

/**
 * IrnoIdRegisterForm — OTP-first registration flow.
 *
 * Step 1: Enter mobile → request OTP.
 * Step 2: Enter 6-digit OTP code.
 *   - If user already exists → logged in (redirect to destination).
 *   - If new user → Step 3.
 * Step 3: Enter firstName, lastName, email (optional) → submit via otp/verify.
 *
 * If navigated from /auth/login with ?mobile=...&fromOtp=1, the mobile is
 * pre-filled and we go straight to Step 3 (OTP already verified on login page).
 *
 * Creates APPLICANT account, NOT Student.
 */

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fa } from '@irno/i18n'

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 disabled:cursor-not-allowed disabled:opacity-60'

const btnPrimary =
  'w-full rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/40 disabled:cursor-not-allowed disabled:opacity-50'

type RegStep = 'mobile' | 'code' | 'profile'

function IrnoIdRegisterFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const returnTo = searchParams.get('returnTo')
  const app = searchParams.get('app')
  const prefilledMobile = searchParams.get('mobile') ?? ''
  const fromOtp = searchParams.get('fromOtp') === '1'

  // If redirected from OTP login with a mobile that needs profile,
  // skip straight to the profile step.
  const [step, setStep] = useState<RegStep>(fromOtp && prefilledMobile ? 'profile' : 'mobile')
  const [mobile, setMobile] = useState(prefilledMobile)
  const [code, setCode] = useState('')
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '' })
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

  function handleProfileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  /**
   * Post-register redirect priority:
   *   1. valid returnTo (absolute URL, allowlisted) → cross-app redirect
   *   2. hub-internal `from` path (SSO or protected route redirect)
   *   3. app context default (app=career → career-web/studio)
   *   4. role-based Hub default (new users are usually APPLICANT → /portal)
   */
  function handleSuccess(role?: string) {
    // Priority 1: absolute returnTo (cross-app, allowlisted)
    const validReturnTo = getValidReturnTo(returnTo)
    if (validReturnTo) {
      window.location.href = validReturnTo
      return
    }

    // Priority 2: hub-internal relative path
    if (from && from.startsWith('/') && !from.startsWith('//')) {
      router.push(from)
      router.refresh()
      return
    }

    // Priority 3: app context default
    if (app === 'career') {
      const careerUrl = process.env['NEXT_PUBLIC_CAREER_WEB_URL'] ?? 'http://localhost:3002'
      window.location.href = `${careerUrl}/studio`
      return
    }
    if (app === 'meetino') {
      // New Meetino user — redirect through SSO to get a Meetino session
      const meetinoCallback = process.env['NEXT_PUBLIC_MEETINO_CALLBACK_URL'] ?? 'http://localhost:3001/auth/irno/callback'
      window.location.href = `/sso/meetino?redirect_uri=${encodeURIComponent(meetinoCallback)}`
      return
    }

    // Priority 4: role-based Hub default (new registrants are APPLICANT → /portal)
    const staffRoles = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'TEACHER', 'MENTOR']
    const destination = role && staffRoles.includes(role) ? '/dashboard' : '/portal'
    router.push(destination)
    router.refresh()
  }

  // ── Step 1: Request OTP ──
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mobile, purpose: 'REGISTER' }),
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

  // ── Step 2: Verify OTP (without profile = check if user exists) ──
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Send without profile fields first — if user exists they'll be logged in.
      // If new user, server returns needsProfile=true.
      const res = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mobile, code }),
      })
      type VerifyBody = { needsProfile?: boolean; message?: string; role?: string; code?: string }
      const raw1 = (await res.json()) as { data?: VerifyBody } & VerifyBody
      const json = raw1.data ?? raw1
      if (!res.ok) {
        const errCode = json.code ?? ''
        if (errCode === 'EXPIRED_CODE') setError(fa.irnoId.otp.expiredCode)
        else if (errCode === 'TOO_MANY_ATTEMPTS') setError(fa.irnoId.otp.tooManyAttempts)
        else if (errCode === 'INVALID_CODE') setError(fa.irnoId.otp.invalidCode)
        else setError(json.message ?? fa.errors.generic)
        return
      }
      if (json.needsProfile) {
        // New user — move to profile step
        setStep('profile')
        return
      }
      // Existing user — logged in
      handleSuccess(json.role)
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

  // ── Step 3: Complete profile + create account ──
  async function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!profile.firstName || !profile.lastName) {
      setError('نام و نام خانوادگی الزامی است.')
      return
    }
    setLoading(true)
    try {
      // Re-request a fresh OTP if coming from ?fromOtp=1 (OTP already consumed).
      // We can't re-use the already-consumed OTP, so we need a new one.
      // Solution: request a new OTP silently, then verify with profile data.
      // But that would require another SMS. Instead, use the /auth/register endpoint
      // with password = undefined, and for OTP-only accounts the backend handles it.
      //
      // For the fromOtp=1 flow (redirected from login after OTP consumed):
      // We send to /api/v1/auth/otp/request then immediately verify with profile.
      // This works because the OTP was already consumed on the login page — we need a fresh one.
      //
      // Actually the cleaner approach: request + verify in one step here.
      // Step 3 always requests a fresh OTP first (silent — user won't notice
      // since they just verified one), then verifies with profile.

      // Request fresh OTP
      const reqRes = await fetch('/api/v1/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mobile, purpose: 'REGISTER' }),
      })
      if (!reqRes.ok) {
        const reqJson = (await reqRes.json()) as { message?: string }
        setError(reqJson.message ?? fa.errors.generic)
        return
      }
      const reqJson = (await reqRes.json()) as { message?: string }
      // We can't auto-verify since we need the actual code.
      // The UX for fromOtp=1 path: show the code input again after requesting.
      // This is the correct security-safe approach — no OTP bypass allowed.
      void reqJson
      setSentTo(mobile)
      setCooldown(60)
      // Show code input step (user needs to enter the new OTP sent to their mobile)
      setStep('code')
      setError('یک کد جدید به شماره شما ارسال شد. کد را وارد کنید تا ثبت‌نام تکمیل شود.')
      // Preserve profile data so Step 2 handler can use it
      // We'll attach profile to the verify call in handleVerifyCodeWithProfile
    } catch {
      setError(fa.errors.networkError)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2 (with profile): Final verify when profile data is available ──
  // When profile state is non-empty during code verification, include profile fields.
  async function handleVerifyWithProfile(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const body: Record<string, string> = { mobile, code }
      if (profile.firstName) body.firstName = profile.firstName
      if (profile.lastName) body.lastName = profile.lastName
      if (profile.email) body.email = profile.email

      const res = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      type VerifyWithProfileBody = { needsProfile?: boolean; message?: string; role?: string; code?: string }
      const raw2 = (await res.json()) as { data?: VerifyWithProfileBody } & VerifyWithProfileBody
      const json2 = raw2.data ?? raw2
      if (!res.ok) {
        const errCode = json2.code ?? ''
        if (errCode === 'EXPIRED_CODE') setError(fa.irnoId.otp.expiredCode)
        else if (errCode === 'TOO_MANY_ATTEMPTS') setError(fa.irnoId.otp.tooManyAttempts)
        else if (errCode === 'INVALID_CODE') setError(fa.irnoId.otp.invalidCode)
        else setError(json2.message ?? fa.errors.generic)
        return
      }
      if (json2.needsProfile) {
        // Still needs profile — should not happen here but handle gracefully
        setStep('profile')
        return
      }
      handleSuccess(json2.role)
    } catch {
      setError(fa.errors.networkError)
    } finally {
      setLoading(false)
    }
  }

  // Decide which code-step handler to use based on whether profile is filled
  const hasProfile = !!profile.firstName && !!profile.lastName
  const codeSubmitHandler = hasProfile ? handleVerifyWithProfile : handleVerifyCode

  // ── Render ──

  if (step === 'mobile') {
    return (
      <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
        <p className="text-sm text-[var(--color-text-muted)]">
          {fa.irnoId.otp.registerHint}
        </p>
        <div>
          <label htmlFor="reg-mobile" className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
            {fa.irnoId.mobile} <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            id="reg-mobile"
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
        <p className="text-center text-xs text-[var(--color-text-muted)]">
          با ساخت حساب، یک عضو جدید ایرنو می‌شوید. هیچ ثبت‌نام دوره‌ای انجام نمی‌شود.
        </p>
      </form>
    )
  }

  if (step === 'code' && !hasProfile) {
    return (
      <form onSubmit={codeSubmitHandler} className="space-y-4" noValidate>
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
          <label htmlFor="reg-code" className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
            {fa.irnoId.otp.enterCode}
          </label>
          <input
            id="reg-code"
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
          {loading ? 'در حال بررسی...' : 'تأیید کد'}
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

  if (step === 'code' && hasProfile) {
    // Profile is filled, waiting for fresh OTP code to finalize account creation
    return (
      <form onSubmit={codeSubmitHandler} className="space-y-4" noValidate>
        <p className="rounded-lg bg-[var(--color-brand-500)]/10 px-4 py-3 text-sm text-[var(--color-brand-700)]">
          {sentTo ? fa.irnoId.otp.codeSent(sentTo) : 'کد تأیید ارسال شد.'}
        </p>
        <div>
          <label htmlFor="reg-code-final" className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
            {fa.irnoId.otp.enterCode}
          </label>
          <input
            id="reg-code-final"
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
          {loading ? 'در حال ساخت حساب...' : fa.irnoId.registerButton}
        </button>
      </form>
    )
  }

  // Step: profile completion
  return (
    <form onSubmit={handleCompleteProfile} className="space-y-4" noValidate>
      <p className="text-sm text-[var(--color-text-muted)]">
        {fa.irnoId.otp.completeProfileHint}
      </p>

      {/* Mobile (read-only — already verified) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
          {fa.irnoId.mobile}
        </label>
        <input
          type="tel"
          value={mobile}
          readOnly
          dir="ltr"
          className={`${inputCls} opacity-70`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="reg-firstName" className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
            {fa.irnoId.firstName} <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            id="reg-firstName"
            name="firstName"
            value={profile.firstName}
            onChange={handleProfileChange}
            required
            disabled={loading}
            autoFocus
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="reg-lastName" className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
            {fa.irnoId.lastName} <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            id="reg-lastName"
            name="lastName"
            value={profile.lastName}
            onChange={handleProfileChange}
            required
            disabled={loading}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
          {fa.irnoId.emailOptional}
        </label>
        <input
          id="reg-email"
          name="email"
          type="email"
          value={profile.email}
          onChange={handleProfileChange}
          dir="ltr"
          disabled={loading}
          autoComplete="email"
          className={inputCls}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !profile.firstName || !profile.lastName}
        className={btnPrimary}
      >
        {loading ? 'در حال ارسال کد...' : fa.irnoId.otp.completeProfile}
      </button>

      <p className="text-center text-xs text-[var(--color-text-muted)]">
        با ساخت حساب، یک عضو جدید ایرنو می‌شوید. هیچ ثبت‌نام دوره‌ای انجام نمی‌شود.
      </p>
    </form>
  )
}

export function IrnoIdRegisterForm() {
  return (
    <Suspense fallback={<div className="h-60" />}>
      <IrnoIdRegisterFormInner />
    </Suspense>
  )
}
