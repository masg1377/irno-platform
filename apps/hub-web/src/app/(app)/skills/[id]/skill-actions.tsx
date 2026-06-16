'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SkillArchiveButton({ skillId }: { skillId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleArchive() {
    if (!confirm('آیا می‌خواهید این مهارت را بایگانی کنید؟')) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/skills/${skillId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message: string } }
        setError(json.error?.message ?? 'خطا در بایگانی مهارت')
        setLoading(false)
        return
      }
      router.refresh()
    } catch {
      setError('خطا در اتصال به سرور')
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
        className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 transition-colors hover:bg-yellow-100 disabled:opacity-60 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
      >
        {loading ? 'در حال بایگانی...' : 'بایگانی مهارت'}
      </button>
    </div>
  )
}
