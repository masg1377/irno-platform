import type { Metadata } from 'next'
import { NewUserForm } from '@/components/users/NewUserForm'
import { fa } from '@irno/i18n'

export const metadata: Metadata = {
  title: 'کاربر جدید',
}

export default function NewUserPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {fa.users.newUser}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          ایجاد یک حساب کاربری جدید در سیستم
        </p>
      </div>

      <div className="max-w-lg">
        <NewUserForm />
      </div>
    </div>
  )
}
