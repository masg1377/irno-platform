'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fa } from '@irno/i18n'
import { CourseGroupStatus, CourseGroupDto } from '@irno/types'

interface Props {
  group: CourseGroupDto
}

interface UserOption {
  id: string
  fullName: string
  role: string
}

export default function GroupActions({ group }: Props) {
  const router = useRouter()
  const [showEdit, setShowEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  // Edit form state
  const [name, setName] = useState(group.name)
  const [teacherId, setTeacherId] = useState(group.teacherId ?? '')
  const [startDate, setStartDate] = useState(group.startDate?.slice(0, 10) ?? '')
  const [endDate, setEndDate] = useState(group.endDate?.slice(0, 10) ?? '')
  const [capacity, setCapacity] = useState(group.capacity ? String(group.capacity) : '')
  const [scheduleNotes, setScheduleNotes] = useState(group.scheduleNotes ?? '')
  const [status, setStatus] = useState<CourseGroupStatus>(group.status)
  const [selectedMentors, setSelectedMentors] = useState<string[]>(group.mentors.map((m) => m.userId))

  const [teachers, setTeachers] = useState<UserOption[]>([])
  const [mentors, setMentors] = useState<UserOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    if (!showEdit) return
    setLoadingUsers(true)
    fetch('/api/v1/users?limit=200', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const users: UserOption[] = data.data ?? []
        setTeachers(users.filter((u) => u.role === 'TEACHER'))
        setMentors(users.filter((u) => u.role === 'MENTOR' || u.role === 'TEACHER'))
      })
      .finally(() => setLoadingUsers(false))
  }, [showEdit])

  function toggleMentor(userId: string) {
    setSelectedMentors((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = { name, status, scheduleNotes: scheduleNotes || undefined }
      if (teacherId) body.teacherId = teacherId
      if (startDate) body.startDate = startDate
      if (endDate) body.endDate = endDate
      if (capacity) body.capacity = parseInt(capacity, 10)

      const res = await fetch(`/api/v1/groups/${group.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(Array.isArray(e.message) ? e.message.join(', ') : (e.message ?? 'خطا'))
      }

      // Sync mentors: add new, remove removed
      const original = group.mentors.map((m) => m.userId)
      const toAdd = selectedMentors.filter((id) => !original.includes(id))
      const toRemove = original.filter((id) => !selectedMentors.includes(id))

      await Promise.all([
        ...toAdd.map((uid) =>
          fetch(`/api/v1/groups/${group.id}/mentors`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid }),
          })
        ),
        ...toRemove.map((uid) =>
          fetch(`/api/v1/groups/${group.id}/mentors/${uid}`, {
            method: 'DELETE',
            credentials: 'include',
          })
        ),
      ])

      setShowEdit(false)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطای ناشناخته')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('آیا از حذف این گروه اطمینان دارید؟')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/groups/${group.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('خطا در حذف')
      router.push('/groups')
    } catch {
      alert('خطا در حذف گروه')
    } finally {
      setDeleting(false)
    }
  }

  const statusOptions: { value: CourseGroupStatus; label: string }[] = [
    { value: CourseGroupStatus.UPCOMING, label: fa.courseGroupStatus.UPCOMING },
    { value: CourseGroupStatus.ACTIVE, label: fa.courseGroupStatus.ACTIVE },
    { value: CourseGroupStatus.COMPLETED, label: fa.courseGroupStatus.COMPLETED },
    { value: CourseGroupStatus.CANCELLED, label: fa.courseGroupStatus.CANCELLED },
  ]

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setShowEdit(true)}
          className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          ویرایش
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/40 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
        >
          {deleting ? '...' : 'حذف'}
        </button>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">ویرایش گروه</h2>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام گروه</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-right"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">وضعیت</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CourseGroupStatus)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مدرس</label>
                {loadingUsers ? (
                  <p className="text-sm text-gray-400">در حال بارگذاری...</p>
                ) : (
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="">— بدون مدرس —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.fullName}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاریخ شروع</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاریخ پایان</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ظرفیت</label>
                <input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="مثال: ۱۵"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">برنامه زمانی</label>
                <input
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  placeholder="مثال: شنبه‌ها ساعت ۲۰"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>

              {/* Mentor picker */}
              {!loadingUsers && mentors.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">منتورها</label>
                  <div className="flex flex-wrap gap-2">
                    {mentors.map((m) => {
                      const selected = selectedMentors.includes(m.id)
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleMentor(m.id)}
                          className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                            selected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {m.fullName}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setShowEdit(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                انصراف
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'در حال ذخیره...' : 'ذخیره'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
