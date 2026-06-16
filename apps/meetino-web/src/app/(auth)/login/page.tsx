'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createIrnoAuthClient } from '@irno/auth-client';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { AuthCard } from '@/components/ui/AuthCard';

const legacySchema = z.object({
  email: z.string().email('ایمیل معتبر نیست'),
  password: z.string().min(1, 'رمز عبور الزامی است'),
});
type LegacyFormValues = z.infer<typeof legacySchema>;

const IRNO_SSO_ENABLED = process.env.NEXT_PUBLIC_IRNO_SSO_ENABLED === 'true';

/**
 * @irno/auth-client instance for Meetino.
 * Uses env vars so no hardcoded URLs in logic.
 * NEXT_PUBLIC_IRNO_ID_URL = Hub web URL (hosts /auth/* Irno ID Hosted UI)
 * NEXT_PUBLIC_MEETINO_CALLBACK_URL = Meetino callback for SSO code
 */
const irnoAuth = createIrnoAuthClient({
  irnoIdBaseUrl:
    process.env.NEXT_PUBLIC_IRNO_ID_URL ??
    process.env.NEXT_PUBLIC_IRNO_HUB_WEB_URL ??
    'http://localhost:3000',
  appId: process.env.NEXT_PUBLIC_MEETINO_APP_ID ?? 'meetino',
  appName: 'میتینو',
  redirectUri:
    process.env.NEXT_PUBLIC_MEETINO_CALLBACK_URL ??
    'http://localhost:3001/auth/irno/callback',
});

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') ?? '/dashboard';
  const [serverError, setServerError] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LegacyFormValues>({ resolver: zodResolver(legacySchema) });

  const onLegacySubmit = async (values: LegacyFormValues) => {
    setServerError(null);
    try {
      await login(values);
      router.push(nextPath);
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : 'ورود ناموفق بود. لطفاً دوباره تلاش کنید.'
      );
    }
  };

  // Use @irno/auth-client to build SSO login and register URLs.
  const loginUrl = irnoAuth.buildLoginUrl({
    returnTo: nextPath !== '/dashboard' ? nextPath : undefined,
  });
  const registerUrl = irnoAuth.buildRegisterUrl();

  return (
    <div className="space-y-5">
      {serverError && <Alert variant="error">{serverError}</Alert>}

      {IRNO_SSO_ENABLED && (
        <>
          <a
            href={loginUrl}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-brand-300 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/20 dark:text-brand-200 dark:hover:bg-brand-900/40"
          >
            <span className="text-lg">🏛️</span>
            ورود با حساب ایرنو
          </a>
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            پس از ورود با حساب ایرنو، اطلاعات شما از هاب ایرنو خوانده می‌شود.
          </p>
          <div className="relative flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400">یا</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>
          {!showLegacy && (
            <button
              type="button"
              onClick={() => setShowLegacy(true)}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-2"
            >
              ورود با ایمیل و رمز عبور (قدیمی)
            </button>
          )}
        </>
      )}

      {(!IRNO_SSO_ENABLED || showLegacy) && (
        <>
          {IRNO_SSO_ENABLED && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              ⚠️ ورود قدیمی میتینو. توصیه می‌شود از «ورود با حساب ایرنو» استفاده کنید.
            </p>
          )}
          <form noValidate onSubmit={handleSubmit(onLegacySubmit)} className="space-y-4">
            <FormField label="ایمیل" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" dir="ltr"
                invalid={!!errors.email} placeholder="you@example.com" {...register('email')} />
            </FormField>
            <FormField label="رمز عبور" htmlFor="password" error={errors.password?.message}>
              <Input id="password" type="password" autoComplete="current-password" dir="ltr"
                invalid={!!errors.password} {...register('password')} />
            </FormField>
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'در حال ورود…' : 'ورود'}
            </Button>
          </form>
        </>
      )}

      {/* SSO register link — rendered in footer via AuthCard, but also expose here for accessibility */}
      {IRNO_SSO_ENABLED && !showLegacy && (
        <p className="hidden">
          <a href={registerUrl}>ساخت حساب ایرنو</a>
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  const registerUrl = irnoAuth.buildRegisterUrl();

  return (
    <AuthCard
      title="ورود به میتینو"
      subtitle={
        IRNO_SSO_ENABLED
          ? 'با حساب ایرنو وارد شوید.'
          : 'برای ساخت و مدیریت جلسه‌ها وارد شوید.'
      }
      footer={
        IRNO_SSO_ENABLED ? (
          <>
            حساب ندارید؟{' '}
            <a href={registerUrl} className="font-medium text-brand-700 hover:text-brand-800">
              ساخت حساب ایرنو
            </a>
          </>
        ) : (
          <>
            حساب کاربری ندارید؟{' '}
            <Link href="/register" className="font-medium text-brand-700 hover:text-brand-800">
              ثبت‌نام کنید
            </Link>
          </>
        )
      }
    >
      <Suspense fallback={<div className="h-40" />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
