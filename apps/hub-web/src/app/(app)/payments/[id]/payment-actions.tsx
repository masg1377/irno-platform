'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fa } from '@irno/i18n'

interface Props {
  paymentId: string
  canPay: boolean
  hasInstallments: boolean
  remainingAmount: number
}

interface InstallmentRow {
  installmentNumber: number
  amountToman: string
  dueDate: string
}

export default function PaymentActions({ paymentId, canPay, hasInstallments, remainingAmount }: Props) {
  const router = useRouter()
  const [showPayModal, setShowPayModal] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Record payment form
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('CASH')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [receiptNote, setReceiptNote] = useState('')

  // Installments form
  const [rows, setRows] = useState<InstallmentRow[]>([
    { installmentNumber: 1, amountToman: '', dueDate: '' },
  ])

  async function handleRecordPayment() {
    if (!amount || parseInt(amount, 10) <= 0) { setError('مبلغ الزامی است'); return }
    if (parseInt(amount, 10) > remainingAmount) { setError(`مبلغ بیش از مانده (${remainingAmount.toLocaleString('fa-IR')} تومان) است`); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/v1/payments/${paymentId}/transactions`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountToman: parseInt(amount, 10), method, paidAt, receiptNote: receiptNote || undefined }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(Array.isArray(e.message) ? e.message.join(', ') : (e.message ?? 'خطا'))
      }
      setShowPayModal(false)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطای ناشناخته')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateInstallments() {
    const installments = rows.map((r) => ({
      installmentNumber: r.installmentNumber,
      amountToman: parseInt(r.amountToman, 10),
      dueDate: r.dueDate,
    }))
    if (installments.some((i) => !i.amountToman || !i.dueDate)) {
      setError('مبلغ و سررسید همه اقساط الزامی است'); return
    }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/v1/payments/${paymentId}/installments`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installments }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(Array.isArray(e.message) ? e.message.join(', ') : (e.message ?? 'خطا'))
      }
      setShowInstallModal(false)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطای ناشناخته')
    } finally {
      setSaving(false)
    }
  }

  function addRow() {
    setRows((prev) => [...prev, { installmentNumber: prev.length + 1, amountToman: '', dueDate: '' }])
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm'

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {canPay && (
          <button onClick={() => { setShowPayModal(true); setError('') }}
            className="px-4 py-2 rounded-lg bg-[var(--color-brand-600)] text-white text-sm font-semibold hover:bg-[var(--color-brand-700)]">
            {fa.payments.recordPayment}
          </button>
        )}
        {!hasInstallments && (
          <button onClick={() => { setShowInstallModal(true); setError('') }}
            className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]">
            {fa.payments.createInstallments}
          </button>
        )}
      </div>

      {/* Record payment modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{fa.payments.recordPayment}</h2>
              <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {error && <div className="mb-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.payments.amountToman} <span className="text-red-500">*</span></label>
                <input type="number" min={1} max={remainingAmount} value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} placeholder="0" />
                <p className="text-xs text-gray-500 mt-0.5">مانده: {remainingAmount.toLocaleString('fa-IR')} تومان</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.payments.paymentMethod}</label>
                <select value={method} onChange={e => setMethod(e.target.value)} className={inputCls}>
                  {Object.entries(fa.paymentMethod).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.payments.paidAt}</label>
                <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.payments.receiptNote}</label>
                <input value={receiptNote} onChange={e => setReceiptNote(e.target.value)} className={inputCls} placeholder="اختیاری" />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setShowPayModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300">انصراف</button>
              <button onClick={handleRecordPayment} disabled={saving}
                className="px-5 py-2 rounded-lg bg-[var(--color-brand-600)] text-white text-sm font-semibold disabled:opacity-50">
                {saving ? '...' : 'ثبت پرداخت'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create installments modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{fa.payments.createInstallments}</h2>
              <button onClick={() => setShowInstallModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {error && <div className="mb-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>}
            <div className="space-y-3">
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">شماره قسط</label>
                    <input type="number" min={1} value={row.installmentNumber}
                      onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, installmentNumber: parseInt(e.target.value, 10) } : x))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">مبلغ (تومان)</label>
                    <input type="number" min={1} value={row.amountToman}
                      onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, amountToman: e.target.value } : x))}
                      className={inputCls} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">سررسید</label>
                    <input type="date" value={row.dueDate}
                      onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, dueDate: e.target.value } : x))}
                      className={inputCls} />
                  </div>
                </div>
              ))}
              <button type="button" onClick={addRow} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                + افزودن قسط
              </button>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setShowInstallModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300">انصراف</button>
              <button onClick={handleCreateInstallments} disabled={saving}
                className="px-5 py-2 rounded-lg bg-[var(--color-brand-600)] text-white text-sm font-semibold disabled:opacity-50">
                {saving ? '...' : 'ذخیره اقساط'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
