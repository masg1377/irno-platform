'use client'

import { useState } from 'react'
import type { MeetinoIntegrationStatusDto } from '@irno/types'
import { fa } from '@irno/i18n'

interface Props {
  status: MeetinoIntegrationStatusDto | null
}

export default function MeetinoIntegrationCard({ status }: Props) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs: number | null } | null>(null)

  const meetinoWebUrl = typeof window !== 'undefined'
    ? undefined
    : undefined // resolved server-side in page.tsx; here we rely on the status object

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/v1/integrations/meetino/test', { method: 'POST' })
      const data = await res.json()
      setTestResult(data.data ?? data)
    } catch {
      setTestResult({ ok: false, message: 'خطا در ارتباط با سرور', latencyMs: null })
    } finally {
      setTesting(false)
    }
  }

  if (!status) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-sm text-gray-400 dark:text-gray-500">اطلاعات یکپارچه‌سازی در دسترس نیست.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {/* Meetino icon placeholder */}
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">میتینو</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{fa.integrationSettings.meetinoDescription}</p>
          </div>
        </div>
        <StatusBadge enabled={status.enabled} />
      </div>

      {/* Config rows */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        <ConfigRow
          label={fa.integrationSettings.webUrl}
          value={status.webUrlConfigured ? 'تنظیم شده است' : fa.integrationSettings.notConfigured}
          ok={status.webUrlConfigured}
        />
        <ConfigRow
          label={fa.integrationSettings.apiUrl}
          value={status.apiUrlConfigured ? 'تنظیم شده است' : fa.integrationSettings.notConfigured}
          ok={status.apiUrlConfigured}
        />
        <ConfigRow
          label="کلید API"
          value={status.apiKeyConfigured ? fa.integrationSettings.apiKeyConfigured : fa.integrationSettings.apiKeyMissing}
          ok={status.apiKeyConfigured}
        />
      </div>

      {/* Actions */}
      <div className="p-5 flex flex-wrap items-center gap-3">
        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {testing ? 'در حال آزمایش...' : fa.integrationSettings.testConnection}
        </button>

        {status.webUrlConfigured && (
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.open('/api/v1/integrations/meetino/status') }}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {fa.integrationSettings.openMeetino}
          </a>
        )}
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`mx-5 mb-5 p-3 rounded-lg text-sm ${
          testResult.ok
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
        }`}>
          {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
          {testResult.latencyMs !== null && ` (${testResult.latencyMs}ms)`}
        </div>
      )}

      {/* Setup note */}
      {!status.enabled && (
        <div className="mx-5 mb-5 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
          برای فعال‌سازی اتصال میتینو، متغیرهای زیر را در فایل <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">.env</code> تنظیم کنید:
          <ul className="mt-2 space-y-0.5 list-disc list-inside font-mono text-xs">
            <li>MEETINO_ENABLED=true</li>
            <li>MEETINO_WEB_URL=https://meet.irno.ir</li>
            <li>MEETINO_API_URL=https://meet.irno.ir</li>
            <li>MEETINO_API_KEY=&lt;bearer-token&gt;</li>
          </ul>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
      enabled
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
    }`}>
      {enabled ? fa.integrationSettings.enabled : fa.integrationSettings.disabled}
    </span>
  )
}

function ConfigRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${ok ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
          {value}
        </span>
        <span className={`w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
      </div>
    </div>
  )
}
