'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  resumeId: string
  resumeTitle: string
}

export function ResumeListActions({ resumeId, resumeTitle }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDuplicate() {
    setLoading(true)
    setOpen(false)
    try {
      const res = await fetch(`/api/v1/career/resumes/${resumeId}/duplicate`, { method: 'POST' })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    setConfirmDelete(false)
    setOpen(false)
    try {
      const res = await fetch(`/api/v1/career/resumes/${resumeId}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5 justify-end">
        <a
          href={`/resumes/${resumeId}`}
          className="border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] rounded-lg px-3 py-1.5 text-xs transition-colors"
        >
          ویرایش
        </a>
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            disabled={loading}
            className="border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] rounded-lg px-2 py-1.5 text-xs transition-colors"
          >
            {loading ? '...' : '⋯'}
          </button>
          {open && (
            <>
              {/* backdrop */}
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute left-0 top-8 z-20 w-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] py-1 shadow-lg">
                <button
                  onClick={handleDuplicate}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5 shrink-0"><rect x="4" y="4" width="9" height="9" rx="1.5"/><path d="M3 11V3h8"/></svg>
                  کپی رزومه
                </button>
                <button
                  onClick={() => { setConfirmDelete(true); setOpen(false) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5 shrink-0"><polyline points="2,4 14,4"/><path d="M5 4V2h6v2"/><path d="M6 7v5M10 7v5"/><path d="M3 4l1 10h8l1-10"/></svg>
                  حذف
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">حذف رزومه</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              آیا مطمئن هستید که می‌خواهید «{resumeTitle}» را حذف کنید؟ این عمل قابل بازگشت نیست.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg px-4 py-2 text-sm hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleDelete}
                className="bg-[var(--color-danger)] text-white rounded-lg px-4 py-2 text-sm hover:opacity-90 transition-opacity"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
