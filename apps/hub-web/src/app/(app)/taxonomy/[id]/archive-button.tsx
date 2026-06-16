'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ArchiveButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleArchive() {
    if (!confirm('آیا می‌خواهید این دسته‌بندی را بایگانی کنید؟')) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/taxonomy/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        router.refresh()
      } else {
        const json = (await res.json()) as { error?: { message: string[] | string } }
        const msg = json.error?.message
        setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'خطا در بایگانی دسته‌بندی'))
      }
    } catch {
      setError('خطا در اتصال به سرور')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        type="button"
        onClick={handleArchive}
        disabled={loading}
        className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-800 transition-colors hover:bg-yellow-100 disabled:opacity-60 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
      >
        {loading ? 'در حال بایگانی...' : 'بایگانی دسته‌بندی'}
      </button>
    </div>
  )
}
