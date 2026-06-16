import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPayment } from '@/lib/api'
import { fa } from '@irno/i18n'
import { PaymentStatus } from '@irno/types'
import PaymentActions from './payment-actions'

interface Props { params: Promise<{ id: string }> }

const statusColors: Record<PaymentStatus, string> = {
  UNPAID: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  OVERDUE: 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  REFUNDED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  FREE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}

function fmt(n: number) { return n.toLocaleString('fa-IR') + ' تومان' }

export default async function PaymentDetailPage({ params }: Props) {
  const { id } = await params
  const payment = await getPayment(id)
  if (!payment) notFound()

  const canPay = payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.FREE
  const hasInstallments = (payment.installments?.length ?? 0) > 0

  return (
    <div className="space-y-6" dir="rtl">
      {/* Breadcrumb */}
      <nav className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
        <Link href="/payments" className="hover:text-[var(--color-text-primary)]">{fa.payments.title}</Link>
        <span>/</span>
        <span>{payment.studentName}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{fa.payments.paymentDetail}</h1>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColors[payment.status]}`}>
              {fa.paymentStatus[payment.status]}
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            <Link href={`/students/${payment.studentId}`} className="text-blue-600 hover:underline dark:text-blue-400">{payment.studentName}</Link>
            {' — '}{payment.studentCode}
          </p>
        </div>
        <PaymentActions paymentId={id} canPay={canPay} hasInstallments={hasInstallments} remainingAmount={payment.remainingAmountToman} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 text-center">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">{fa.payments.totalAmount}</p>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{fmt(payment.totalAmountToman)}</p>
        </div>
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-[var(--color-bg-elevated)] p-4 text-center">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">{fa.payments.paidAmount}</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-400">{fmt(payment.paidAmountToman)}</p>
        </div>
        <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-[var(--color-bg-elevated)] p-4 text-center">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">{fa.payments.remainingAmount}</p>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{fmt(payment.remainingAmountToman)}</p>
        </div>
      </div>

      {/* Course info */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 flex gap-6 text-sm">
        <div>
          <p className="text-[var(--color-text-muted)] mb-0.5">{fa.enrollments.course}</p>
          <Link href={`/courses/${payment.courseId}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">{payment.courseName}</Link>
        </div>
        {payment.courseGroupName && (
          <div>
            <p className="text-[var(--color-text-muted)] mb-0.5">{fa.enrollments.group}</p>
            <Link href={`/groups/${payment.courseGroupId}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">{payment.courseGroupName}</Link>
          </div>
        )}
        <div>
          <p className="text-[var(--color-text-muted)] mb-0.5">ثبت‌نام</p>
          <Link href={`/enrollments/${payment.enrollmentId}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">مشاهده ثبت‌نام</Link>
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
        <h2 className="font-semibold text-[var(--color-text-primary)] mb-4">{fa.payments.transactions}</h2>
        {!payment.transactions?.length ? (
          <p className="text-sm text-[var(--color-text-muted)]">{fa.payments.noTransactions}</p>
        ) : (
          <div className="space-y-3">
            {payment.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{fmt(t.amountToman)}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {fa.paymentMethod[t.method]} — {new Date(t.paidAt).toLocaleDateString('fa-IR')}
                    {t.receiptNote && ` — ${t.receiptNote}`}
                  </p>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">{t.recordedByName}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Installments */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
        <h2 className="font-semibold text-[var(--color-text-primary)] mb-4">{fa.payments.installments}</h2>
        {!payment.installments?.length ? (
          <p className="text-sm text-[var(--color-text-muted)]">{fa.payments.noInstallments}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="pb-2 text-right text-xs text-[var(--color-text-muted)]">شماره</th>
                  <th className="pb-2 text-right text-xs text-[var(--color-text-muted)]">مبلغ</th>
                  <th className="pb-2 text-right text-xs text-[var(--color-text-muted)]">{fa.payments.dueDate}</th>
                  <th className="pb-2 text-right text-xs text-[var(--color-text-muted)]">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {payment.installments.map((inst) => (
                  <tr key={inst.id} className={inst.isOverdue ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                    <td className="py-2.5 text-[var(--color-text-secondary)]">{inst.installmentNumber}</td>
                    <td className="py-2.5 font-medium">{fmt(inst.amountToman)}</td>
                    <td className="py-2.5 text-[var(--color-text-secondary)]">{new Date(inst.dueDate).toLocaleDateString('fa-IR')}</td>
                    <td className="py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        inst.isOverdue ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        inst.status === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        inst.status === 'WAIVED' ? 'bg-gray-100 text-gray-600' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {inst.isOverdue ? fa.payments.overdue : fa.installmentStatus[inst.status as keyof typeof fa.installmentStatus]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
