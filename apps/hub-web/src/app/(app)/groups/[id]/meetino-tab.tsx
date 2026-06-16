'use client'

import { useState } from 'react'
import type { MeetinoMeetingReferenceDto, MeetinoAttendanceRecordDto } from '@irno/types'
import { MeetinoMeetingStatus } from '@irno/types'
import { fa } from '@irno/i18n'

interface Props {
  groupId: string
  initialReference: MeetinoMeetingReferenceDto | null
  initialAttendance: MeetinoAttendanceRecordDto[]
  userRole: string
  meetinoWebUrl?: string
}

const statusColors: Record<MeetinoMeetingStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  LIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  ENDED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  UNKNOWN: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}ساعت ${m % 60}دقیقه`
  return `${m} دقیقه`
}

export default function MeetinoTab({ groupId, initialReference, initialAttendance, userRole, meetinoWebUrl }: Props) {
  const [reference, setReference] = useState<MeetinoMeetingReferenceDto | null>(initialReference)
  const [attendance, setAttendance] = useState<MeetinoAttendanceRecordDto[]>(initialAttendance)
  const [showAttach, setShowAttach] = useState(false)
  const [loading, setLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const canManage = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN'

  // ── Attach/Create meeting form state ──
  const [form, setForm] = useState({
    title: '',
    startsAt: '',
    manualJoinUrl: '',
    createInMeetino: false,
  })

  async function handleAttach(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/groups/${groupId}/meetino`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title || undefined,
          startsAt: form.startsAt || undefined,
          manualJoinUrl: form.manualJoinUrl || undefined,
          createInMeetino: form.createInMeetino,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.message ?? 'خطا در ثبت جلسه')
        return
      }
      const data = await res.json()
      setReference(data.data ?? data)
      setShowAttach(false)
    } catch {
      setError('خطا در ارتباط با سرور')
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    setSyncLoading(true)
    setSyncMsg(null)
    try {
      const res = await fetch(`/api/v1/groups/${groupId}/meetino/sync`, { method: 'POST' })
      const data = await res.json()
      const body = data.data ?? data
      setSyncMsg(body.message ?? 'همگام‌سازی انجام شد')
      // Refresh attendance
      const attRes = await fetch(`/api/v1/groups/${groupId}/meetino/attendance`)
      if (attRes.ok) {
        const attData = await attRes.json()
        setAttendance(attData.data ?? attData ?? [])
      }
    } catch {
      setSyncMsg('خطا در همگام‌سازی')
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status header */}
      {reference ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-1">
                {reference.title}
              </h3>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColors[reference.status as MeetinoMeetingStatus]}`}>
                {fa.meetinoMeetingStatus[reference.status as keyof typeof fa.meetinoMeetingStatus] ?? reference.status}
              </span>
            </div>
            <div className="flex gap-2">
              {canManage && (
                <button
                  onClick={handleSync}
                  disabled={syncLoading}
                  className="px-3 py-1.5 text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  {syncLoading ? 'در حال همگام‌سازی...' : fa.meetino.syncAttendance}
                </button>
              )}
              <a
                href={reference.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                {fa.meetino.openInMeetino} ↗
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{fa.meetino.joinUrl}</p>
              <a href={reference.joinUrl} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline break-all">
                {reference.joinUrl}
              </a>
            </div>
            {reference.startsAt && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{fa.meetino.scheduledAt}</p>
                <p className="text-gray-800 dark:text-gray-200">
                  {new Date(reference.startsAt).toLocaleString('fa-IR')}
                </p>
              </div>
            )}
            {reference.lastSyncedAt && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{fa.meetino.lastSynced}</p>
                <p className="text-gray-800 dark:text-gray-200">
                  {new Date(reference.lastSyncedAt).toLocaleString('fa-IR')}
                </p>
              </div>
            )}
          </div>

          {syncMsg && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              {syncMsg}
            </div>
          )}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-14 text-gray-400 dark:text-gray-600">
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
          <p className="text-sm mb-4">{fa.meetino.noSession}</p>
          {canManage && (
            <button
              onClick={() => setShowAttach(true)}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {fa.meetino.createSession}
            </button>
          )}
        </div>
      )}

      {/* Attach form */}
      {canManage && !reference && showAttach && (
        <form onSubmit={handleAttach} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">{fa.meetino.attachManual}</h4>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{fa.meetino.sessionTitle}</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="عنوان جلسه (اختیاری)"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{fa.meetino.scheduledAt}</label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createInMeetino"
              checked={form.createInMeetino}
              onChange={(e) => setForm({ ...form, createInMeetino: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="createInMeetino" className="text-sm text-gray-700 dark:text-gray-300">
              {fa.meetino.createInMeeting}
            </label>
          </div>

          {!form.createInMeetino && (
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{fa.meetino.manualLinkLabel}</label>
              <input
                type="url"
                value={form.manualJoinUrl}
                onChange={(e) => setForm({ ...form, manualJoinUrl: e.target.value })}
                placeholder="https://meet.irno.ir/m/..."
                required={!form.createInMeetino}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{fa.meetino.manualLinkNote}</p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAttach(false)}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
              انصراف
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {loading ? 'در حال ثبت...' : 'ثبت جلسه'}
            </button>
          </div>
        </form>
      )}

      {/* Attach button if reference exists but user wants to see controls */}
      {canManage && reference && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowAttach(!showAttach)}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {fa.meetino.attachManual}
          </button>
        </div>
      )}

      {/* Attendance records */}
      {attendance.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm">{fa.meetino.attendanceReport}</h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-750 text-xs text-gray-500 dark:text-gray-400">
                <th className="text-right px-5 py-2 font-medium">نام</th>
                <th className="text-right px-5 py-2 font-medium">نوع</th>
                <th className="text-right px-5 py-2 font-medium">مدت حضور</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((rec) => (
                <tr key={rec.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-5 py-2 text-gray-900 dark:text-white">{rec.displayName}</td>
                  <td className="px-5 py-2 text-gray-500 dark:text-gray-400">
                    {rec.wasGuest ? fa.meetino.guest : 'ثبت‌نام‌شده'}
                  </td>
                  <td className="px-5 py-2 text-gray-500 dark:text-gray-400">
                    {formatDuration(rec.durationSeconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
