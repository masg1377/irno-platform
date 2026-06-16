'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  displayName: z.string().min(2, 'نام نمایشی باید حداقل ۲ کاراکتر باشد').max(120),
  email: z.string().email('ایمیل معتبر نیست'),
  password: z
    .string()
    .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد')
    .max(72)
    .regex(/[A-Za-z]/, 'رمز عبور باید حداقل یک حرف داشته باشد')
    .regex(/[0-9]/, 'رمز عبور باید حداقل یک رقم داشته باشد'),
});
type LegacyFormValues = z.infer<typeof legacySchema>;

const IRNO_SSO_ENABLED = process.env.NEXT_PUBLIC_IRNO_SSO_ENABLED === 'true';

/**
 * @irno/auth-client instance for Meetino.
 * Shared config — same irnoIdBaseUrl and redirectUri as login page.
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

function RegisterForm() {
  const { register: doRegister } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LegacyFormValues>({ resolver: zodResolver(legacySchema) });

  const onLegacySubmit = async (values: LegacyFormValues) => {
    setServerError(null);
    try {
      await doRegister(values);
      router.push('/dashboard');
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : 'ثبت‌نام با مشکل مواجه شد. لطفاً دوباره تلاش کنید.'
      );
    }
  };

  // Use @irno/auth-client for Irno ID register URL.
  // buildRegisterUrl() directs the user to Hub /auth/register?app=meetino
  // After Hub registration, Hub SSO flow returns user to Meetino with a code.
  const registerUrl = irnoAuth.buildRegisterUrl();
  const loginUrl = irnoAuth.buildLoginUrl();

  return (
    <div className="space-y-5">
      {serverError && <Alert variant="error">{serverError}</Alert>}

      {/* ── Irno ID — primary when SSO enabled ── */}
      {IRNO_SSO_ENABLED && (
        <>
          <a
            href={registerUrl}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-brand-300 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/20 dark:text-brand-200"
          >
            <span className="text-lg">🏛️</span>
            ساخت حساب ایرنو
          </a>
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            با حساب ایرنو به تمام اپلیکیشن‌های ایرنو دسترسی خواهید داشت.
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
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
            >
              ثبت‌نام با ایمیل (قدیمی — فقط میتینو)
            </button>
          )}
        </>
      )}

      {/* ── Legacy register form — fallback when SSO disabled or dev/test ── */}
      {(!IRNO_SSO_ENABLED || showLegacy) && (
        <>
          {IRNO_SSO_ENABLED && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              ⚠️ این حساب فقط در میتینو فعال است و با هاب ایرنو مرتبط نمی‌شود.
            </p>
          )}
          <form noValidate onSubmit={handleSubmit(onLegacySubmit)} className="space-y-4">
            <FormField label="نام نمایشی" htmlFor="displayName" error={errors.displayName?.message}>
              <Input id="displayName" type="text" autoComplete="name"
                invalid={!!errors.displayName} placeholder="مثلاً سارا محمدی"
                {...register('displayName')} />
            </FormField>
            <FormField label="ایمیل" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" dir="ltr"
                invalid={!!errors.email} placeholder="you@example.com" {...register('email')} />
            </FormField>
            <FormField
              label="رمز عبور"
              htmlFor="password"
              error={errors.password?.message}
              hint="حداقل ۸ کاراکتر، شامل یک حرف و یک رقم"
            >
              <Input id="password" type="password" autoComplete="new-password" dir="ltr"
                invalid={!!errors.password} {...register('password')} />
            </FormField>
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'در حال ساخت حساب…' : 'ثبت‌نام'}
            </Button>
          </form>
        </>
      )}

      {/* Hidden Irno login URL for accessibility */}
      {IRNO_SSO_ENABLED && !showLegacy && (
        <p className="hidden"><a href={loginUrl}>ورود با حساب ایرنو</a></p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const loginUrl = irnoAuth.buildLoginUrl();

  return (
    <AuthCard
      title="ساخت حساب میتینو"
      subtitle={
        IRNO_SSO_ENABLED
          ? 'برای دسترسی کامل، با حساب ایرنو وارد شوید.'
          : 'با ساخت حساب می‌توانید جلسه ایجاد کنید و میزبان آن باشید.'
      }
      footer={
        <>
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          {IRNO_SSO_ENABLED ? (
            <a href={loginUrl} className="font-medium text-brand-700 hover:text-brand-800">
              ورود با حساب ایرنو
            </a>
          ) : (
            <Link href="/login" className="font-medium text-brand-700 hover:text-brand-800">
              ورود به حساب
            </Link>
          )}
        </>
      }
    >
      <Suspense fallback={<div className="h-40" />}>
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}
