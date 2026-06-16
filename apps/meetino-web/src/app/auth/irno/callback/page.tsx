'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthResponse } from '@irno/meetino-shared';

/**
 * /auth/irno/callback
 *
 * Landing page after Hub SSO login. Hub redirects here with:
 *   ?code=<one-time-sso-code>[&returnTo=<path>]
 *
 * Flow:
 *   1. Extract `code` from URL
 *   2. POST /api/auth/irno/exchange { code } → Meetino API exchanges with Hub
 *   3. Meetino API returns accessToken + sets meetino_refresh cookie
 *   4. Store session in Zustand, redirect to returnTo or /dashboard
 *
 * Security:
 *   - `code` is sent to Meetino API backend, never to Hub frontend directly
 *   - `returnTo` is validated to be same-origin (starts with /)
 *   - On error: show message and link back to login
 */
function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuthStore();

  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    // Strict Mode / double-invoke guard
    if (calledRef.current) return;
    calledRef.current = true;

    const code = searchParams.get('code');
    const returnTo = searchParams.get('returnTo');

    if (!code) {
      setErrorMessage('کد SSO دریافت نشد. لطفاً دوباره تلاش کنید.');
      setStatus('error');
      return;
    }

    // Validate returnTo to prevent open redirects
    const destination =
      returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
        ? returnTo
        : '/dashboard';

    (async () => {
      try {
        const data = await apiClient.post<AuthResponse & { user: { id: string; displayName: string; role: string } }>(
          '/auth/irno/exchange',
          { code },
          { skipAuth: true },
        );

        setSession(data as unknown as AuthResponse);
        router.replace(destination);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setErrorMessage('لینک ورود منقضی شده است. لطفاً دوباره وارد شوید.');
          } else {
            setErrorMessage(err.message || 'خطا در ورود با حساب ایرنو. لطفاً دوباره تلاش کنید.');
          }
        } else {
          setErrorMessage('خطای ناشناخته. لطفاً دوباره تلاش کنید.');
        }
        setStatus('error');
      }
    })();
  }, [searchParams, router, setSession]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          در حال ورود با حساب ایرنو…
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-center">
        <div className="mb-4 text-3xl">⚠️</div>
        <h1 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
          خطا در ورود
        </h1>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">{errorMessage}</p>
        <a
          href="/login"
          className="inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          بازگشت به صفحه ورود
        </a>
      </div>
    </div>
  );
}

export default function IrnoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
